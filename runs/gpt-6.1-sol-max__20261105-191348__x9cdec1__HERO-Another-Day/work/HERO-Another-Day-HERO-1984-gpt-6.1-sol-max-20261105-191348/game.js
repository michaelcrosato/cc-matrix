const TITLE = "H.E.R.O. Another Day";
const INTERVIEW = /*INTERVIEW*/ null;
const $ = (id) => document.getElementById(id);
const escapeHTML = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const hubConnection = AIHub.active
	? AIHub.connect({ mode: "shared-world", seats: [1, 4] })
	: Promise.resolve(null);
let renderEnabled = !new URLSearchParams(location.search).has("state-test");
let phase = "title",
	screenType = "title",
	returnScreen = "title",
	myId = 0,
	localPlayers = 1,
	lastInput = "keyboard",
	glyphStyle = "ps",
	manual = false,
	ended = false;
let menuFocus = 0,
	lastActivity = performance.now(),
	lastFrame = performance.now(),
	accumulator = 0,
	menuRepeat = 0,
	shake = 0,
	toastTimer = 0,
	networkTimer = 0,
	hubStarted = false,
	hubFinished = false,
	uiTimer = 0,
	autoInteract = 0,
	screenData = {};
let reducedMotion = false,
	gamepadPrevious = [],
	lastPadAction = 0,
	debugOpen = false,
	attractIndex = 0,
	attractWait = 0,
	gameLoaded = false;
const keys = new Set(),
	touches = new Map();
const pointer = { x: 0, y: 0, active: false, fire: false };
let lastPadConnected = false;
const engineInfo = {
	three: "180",
	rapier: "0.19.3",
	renderer: "initializing",
	errors: [],
	deviceLosses: [],
};
let recoveringGraphics = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071f2b);
const camera = new THREE.OrthographicCamera(-19, 19, 10.7, -10.7, 0.1, 160);
camera.position.set(2, -5.8, 45);
camera.lookAt(2, -5.8, 0);
const requestedBackend = new URLSearchParams(location.search).get("renderer");
let compatibilityRenderer = requestedBackend === "webgl";
engineInfo.compatibilityReason = compatibilityRenderer
	? "Explicit selection"
	: null;
if (!compatibilityRenderer && navigator.gpu) {
	try {
		const adapter = await navigator.gpu.requestAdapter();
		const info = adapter?.info;
		engineInfo.adapter = {
			vendor: info?.vendor || "unknown",
			architecture: info?.architecture || "unknown",
			description: info?.description || "unknown",
		};
		if (
			requestedBackend !== "webgpu" &&
			/swiftshader|llvmpipe|lavapipe/i.test(
				[info?.architecture, info?.description].join(" "),
			)
		) {
			compatibilityRenderer = true;
			engineInfo.compatibilityReason = "Software adapter compatibility";
		}
	} catch {}
}
let renderer = new THREE.WebGPURenderer({
	canvas: $("game"),
	antialias: true,
	powerPreference: "high-performance",
	forceWebGL: compatibilityRenderer,
});
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
await renderer.init();
engineInfo.renderer = renderer.backend.isWebGPUBackend
	? "WebGPU"
	: "WebGL 2 compatibility";
engineInfo.initialRenderer = engineInfo.renderer;
renderer.onDeviceLost = (info) => {
	engineInfo.deviceLosses.push({
		api: info.api,
		reason: info.reason,
		message: info.message,
	});
	recoverGraphics();
};
scene.add(new THREE.HemisphereLight(0xb3ffe0, 0x132b3a, 2));
function toast(text, duration = 3) {
	$("toast").textContent = text;
	$("toast").classList.add("show");
	toastTimer = duration;
}
function handleEvent(type, d) {
	if (type === "shot" && phase !== "attract") audio.effect("shot");
	if (
		[
			"bomb",
			"blast",
			"hurt",
			"kill",
			"refill",
			"rescue",
			"deliver",
			"win",
		].includes(type)
	) {
		if (type !== "hurt" || d.id === myId) audio.effect(type);
	}
	if (type === "blast") {
		shake = reducedMotion ? 0 : 0.22;
	}
	if (type === "gate" && phase !== "attract")
		toast("PASSAGE CLEAR · Watch your air.", 2.4);
	if (type === "rescue" && phase !== "attract")
		toast(CREW_DATA[d.id].name + ": “" + d.quip + "”", 3.2);
	if (type === "deliver" && phase !== "attract")
		toast(
			CREW_DATA[d.id].name + " IS HOME · " + d.rescued + " / 3 CREW SAFE",
			3,
		);
	if (type === "refill" && d.id === myId && phase !== "attract")
		toast("KIT TOPPED UP · Fuel / air / charges / suit", 2);
	if (type === "hurt" && d.id === myId) {
		shake = reducedMotion ? 0 : 0.12;
		if (d.reason === "air")
			toast("AIR EMPTY · Find a green supply station.", 2);
	}
	if (type === "respawn" && d.id === myId)
		toast(
			"SURFACE RECOVERY · " +
				getPlayer()?.lives +
				" shifts left. Rescued crew stay safe.",
			4,
		);
	if (type === "win" && phase !== "attract") {
		if (net.isHost && net.active) net.finish(true);
		if (!AIHub.active) {
			phase = "won";
			saveBest();
			setScreen("result", { won: true });
		}
	}
	if (type === "lost" && phase !== "attract") {
		if (net.isHost && net.active) net.finish(false);
		if (!AIHub.active) {
			phase = "lost";
			setScreen("result", { won: false });
		}
	}
}
const world = new RescueWorld(scene, handleEvent);
world.status = "idle";
world.titleGroup.visible = true;
function getPlayer() {
	return world.players.find((p) => p.id === myId) || world.players[0];
}
function resize() {
	const a = window.innerWidth / window.innerHeight;
	let width = a < 1.3 ? 23 : 32;
	if (a > 2.1) width = a * 19;
	const height = width / a;
	camera.left = -width / 2;
	camera.right = width / 2;
	camera.top = height / 2;
	camera.bottom = -height / 2;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);
resize();
const zeroInput = () => ({
	move: 0,
	jet: false,
	down: false,
	fire: false,
	bomb: false,
	interact: false,
});
class CrewNetwork {
	constructor() {
		this.active = false;
		this.isHost = true;
		this.kind = "none";
		this.inputs = {};
		this.inputAt = {};
		this.room = "";
		this.channel = null;
		this.peer = null;
		this.connections = new Map();
		this.clients = new Map();
		this.token = crypto.randomUUID();
		this.nextSeat = 1;
		this.packet = 0;
		this.lastSnapshot = 0;
		this.departed = new Set();
		this.hostSeen = 0;
		this.peerReady = false;
		this.heartbeat = 0;
		this.started = false;
		this.ended = false;
		this.queuedBomb = false;
		this.queuedInteract = false;
	}
	async hub(info) {
		this.active = true;
		this.kind = "hub";
		this.isHost = info.isHost;
		myId = info.me;
		world.reset(info.players.map((p) => p.id));
		world.status = "idle";
		phase = "waiting";
		screenType = null;
		$("screen").hidden = true;
		$("hud").hidden = false;
		world.titleGroup.visible = false;
		AIHub.on("start", () => {
			hubStarted = true;
			phase = "game";
			world.status = "playing";
		});
		AIHub.on("message", (data, from) => {
			if (ended) return;
			if (
				this.isHost &&
				data?.type === "input" &&
				AIHub.players.some((p) => p.id === from) &&
				!this.departed.has(from)
			) {
				this.inputs[from] = this.cleanInput(data.input);
				this.inputAt[from] = performance.now();
			} else if (
				!this.isHost &&
				from === AIHub.host &&
				data?.type === "snapshot"
			) {
				world.applySnapshot(data.world);
				this.lastSnapshot = performance.now();
			}
		});
		AIHub.on("leave", ({ id }) => {
			this.departed.add(id);
			if (this.isHost) world.removePlayer(id);
			toast("A crew member left the shift.", 3);
		});
		AIHub.on("time-up", () => {
			if (this.isHost) this.finish(world.rescued === 3);
		});
		AIHub.on("end", () => {
			ended = true;
			phase = "end";
			world.status = "ended";
			screenType = null;
			$("screen").hidden = true;
			audio.stop();
			keys.clear();
			pointer.fire = false;
		});
	}
	cleanInput(i = {}) {
		return {
			move: clamp(Number(i.move) || 0, -1, 1),
			jet: !!i.jet,
			down: !!i.down,
			fire: !!i.fire,
			bomb: !!i.bomb,
			interact: !!i.interact,
			aimX: clamp(Number(i.aimX) || 0, -1, 1),
			aimY: clamp(Number(i.aimY) || 0, -1, 1),
		};
	}
	async openRoom(code = null, localOnly = false) {
		this.close();
		this.active = true;
		this.isHost = true;
		this.kind = "room";
		myId = 0;
		localPlayers = 1;
		this.room = (
			code ||
			Array.from(
				crypto.getRandomValues(new Uint8Array(6)),
				(v) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v % 32],
			).join("")
		).toUpperCase();
		this.started = false;
		this.ended = false;
		this.channel = new BroadcastChannel("hero-another-day-" + this.room);
		this.channel.onmessage = (e) => this.receive(e.data);
		world.reset([0]);
		world.status = "idle";
		phase = "waiting";
		setScreen("room");
		if (!localOnly) this.startPeer(true);
		return this.room;
	}
	async joinRoom(code, localOnly = false) {
		this.close();
		this.active = true;
		this.isHost = false;
		this.kind = "room";
		this.room = String(code)
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "")
			.slice(0, 6);
		this.started = false;
		this.ended = false;
		phase = "waiting";
		world.status = "idle";
		this.hostSeen = performance.now();
		this.channel = new BroadcastChannel("hero-another-day-" + this.room);
		this.channel.onmessage = (e) => this.receive(e.data);
		this.channel.postMessage({ type: "hello", token: this.token });
		setScreen("joining");
		if (!localOnly) this.startPeer(false);
		return this.room;
	}
	async startPeer(host) {
		try {
			const { default: Peer } = await import(
				"https://esm.sh/peerjs@1.5.5?bundle"
			);
			if (!this.active || this.kind !== "room") return;
			const room = this.room;
			this.peer = new Peer(host ? "had-rescue-" + room : undefined, {
				debug: 0,
			});
			this.peer.on("open", () => {
				if (this.room !== room) return;
				this.peerReady = true;
				if (host) {
					this.updateRoomText(
						"Online room ready · Share the six-character code.",
					);
				} else {
					const c = this.peer.connect("had-rescue-" + room, { reliable: true });
					this.bindConnection(c);
				}
			});
			this.peer.on("connection", (c) => this.bindConnection(c));
			this.peer.on("error", () => {
				if (this.active)
					this.updateRoomText(
						this.isHost
							? "Local room ready · Online broker unavailable. Same-browser tabs can still join."
							: "Looking for host locally · Check the room code or your connection.",
					);
			});
		} catch {
			this.updateRoomText("Local room ready · Online broker unavailable.");
		}
	}
	bindConnection(c) {
		c.on("open", () => {
			this.connections.set(c.peer, c);
			if (!this.isHost) c.send({ type: "hello", token: this.token });
		});
		c.on("data", (data) => this.receive(data, c));
		c.on("close", () => {
			this.connections.delete(c.peer);
			if (this.isHost) {
				const seat = [...this.clients.values()].find((v) => v.peer === c.peer);
				if (seat) {
					world.removePlayer(seat.id);
					this.clients.delete(seat.token);
					toast("Crew member disconnected.");
				}
			}
		});
	}
	updateRoomText(text) {
		const el = $("roomStatus");
		if (el) el.textContent = text;
	}
	send(data) {
		if (!this.active || this.ended) return;
		if (this.kind === "hub") {
			AIHub.send(data, {
				...(this.isHost ? {} : { to: AIHub.host }),
				reliable: true,
			});
			return;
		}
		const packet = { ...data, packet: ++this.packet, sender: this.token };
		this.channel?.postMessage(packet);
		for (const c of this.connections.values()) if (c.open) c.send(packet);
	}
	receive(d, connection = null) {
		if (!d || !this.active || this.ended) return;
		if (this.isHost) {
			if (d.type === "hello") {
				let seat = this.clients.get(d.token);
				if (!seat) {
					if (this.clients.size >= 3) {
						const msg = { type: "full", target: d.token };
						this.channel?.postMessage(msg);
						connection?.send(msg);
						return;
					}
					const id = this.nextSeat++;
					seat = {
						id,
						token: d.token,
						peer: connection?.peer,
						last: performance.now(),
					};
					this.clients.set(d.token, seat);
					world.addPlayer(id);
					toast(
						"CREW " + (this.clients.size + 1) + " / 4 · Ready for work.",
						3,
					);
				}
				if (connection) seat.peer = connection.peer;
				const welcome = {
					type: "welcome",
					target: d.token,
					id: seat.id,
					started: this.started,
					world: world.snapshot(),
				};
				this.channel?.postMessage(welcome);
				connection?.send(welcome);
				this.updateRoomText(
					this.clients.size +
						1 +
						" / 4 crew connected · " +
						(this.peerReady ? "online & local" : "local room active"),
				);
			}
			if (d.type === "input") {
				const s = this.clients.get(d.sender);
				if (s) {
					this.inputs[s.id] = this.cleanInput(d.input);
					this.inputAt[s.id] = performance.now();
					s.last = performance.now();
				}
			}
			if (d.type === "bye") {
				const s = this.clients.get(d.sender);
				if (s) {
					world.removePlayer(s.id);
					this.clients.delete(d.sender);
					toast("A crew member left the shift.");
				}
			}
		} else {
			if (d.type === "full" && d.target === this.token) {
				toast("This crew is full. Try another room.", 4);
				return;
			}
			if (d.type === "welcome" && d.target === this.token) {
				myId = d.id;
				world.applySnapshot(d.world);
				world.titleGroup.visible = false;
				this.hostSeen = performance.now();
				if (d.started) {
					this.started = true;
					phase = "game";
					closeScreen();
				} else {
					setScreen("joined");
				}
			}
			if (d.type === "snapshot") {
				if (d.packet && this.lastPacket >= d.packet) return;
				this.lastPacket = d.packet;
				this.hostSeen = performance.now();
				world.applySnapshot(d.world);
				if (d.started && !this.started) {
					this.started = true;
					phase = "game";
					closeScreen();
				}
				if (d.ending && phase !== "won" && phase !== "lost") {
					phase = d.ending;
					setScreen("result", { won: phase === "won" });
				}
			}
			if (d.type === "closed") {
				this.close();
				world.status = "idle";
				phase = "title";
				setScreen("title");
				toast("The host ended the room.", 4);
			}
		}
	}
	begin() {
		this.started = true;
		phase = "game";
		world.status = "playing";
		closeScreen();
		this.send({ type: "snapshot", world: world.snapshot(), started: true });
	}
	tick(dt, input) {
		if (!this.active || this.ended || ended) return;
		this.heartbeat += dt;
		if (this.kind === "room" && this.heartbeat > 1) {
			this.heartbeat = 0;
			if (!this.isHost && !this.started)
				this.channel?.postMessage({ type: "hello", token: this.token });
		}
		if (this.isHost) {
			this.send({
				type: "snapshot",
				world: world.snapshot(),
				started: this.started,
				ending: phase === "won" || phase === "lost" ? phase : null,
			});
		} else if (
			(this.kind === "hub" && hubStarted) ||
			(this.kind === "room" && this.started)
		) {
			this.send({
				type: "input",
				input: {
					...input,
					bomb: input.bomb || this.queuedBomb,
					interact: input.interact || this.queuedInteract,
				},
			});
			this.queuedBomb = false;
			this.queuedInteract = false;
		}
		if (
			this.kind === "room" &&
			!this.isHost &&
			performance.now() - this.hostSeen > 20000
		) {
			this.close();
			phase = "title";
			setScreen("title");
			toast("Connection lost. The room is closed.", 4);
		}
	}
	finish(won) {
		if (!this.isHost || hubFinished || ended) return;
		if (this.kind === "hub") {
			hubFinished = true;
			const ids = AIHub.players
				.filter((p) => !this.departed.has(p.id))
				.map((p) => p.id);
			const score = Object.fromEntries(ids.map((id) => [id, world.score]));
			AIHub.finish({
				standings: [ids],
				scores: score,
				won,
				stats: Object.fromEntries(
					ids.map((id) => [
						id,
						{
							"Crew home": world.rescued + "/3",
							"Creatures cleared": world.kills,
							"Shift time": formatTime(world.time),
						},
					]),
				),
			});
		} else {
			this.send({
				type: "snapshot",
				world: world.snapshot(),
				started: true,
				ending: won ? "won" : "lost",
			});
		}
	}
	close() {
		if (this.channel) {
			if (this.isHost) this.channel.postMessage({ type: "closed" });
			else this.channel.postMessage({ type: "bye", sender: this.token });
			this.channel.close();
		}
		this.peer?.destroy();
		this.channel = null;
		this.peer = null;
		this.connections.clear();
		this.clients.clear();
		this.inputs = {};
		this.inputAt = {};
		this.active = false;
		this.isHost = true;
		this.kind = "none";
		this.peerReady = false;
		this.nextSeat = 1;
		this.lastPacket = 0;
		this.ended = false;
		this.queuedBomb = false;
		this.queuedInteract = false;
	}
}
const net = new CrewNetwork();
function formatTime(s) {
	s = Math.max(0, Math.floor(s));
	return (
		String(Math.floor(s / 60)).padStart(2, "0") +
		":" +
		String(s % 60).padStart(2, "0")
	);
}
function storageRead(key, def = null) {
	try {
		return JSON.parse(localStorage.getItem(key)) ?? def;
	} catch {
		return def;
	}
}
function storageWrite(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}
const saved = storageRead("had-settings", {});
glyphStyle = saved.glyph || "ps";
audio.musicVolume = saved.music ?? 0.1;
audio.masterVolume = saved.master ?? 0.7;
audio.sfxVolume = saved.sfx ?? 0.75;
reducedMotion = saved.reduced ?? false;
document.body.classList.toggle("reduced-motion", reducedMotion);
function saveSettings() {
	storageWrite("had-settings", {
		glyph: glyphStyle,
		music: audio.musicVolume,
		master: audio.masterVolume,
		sfx: audio.sfxVolume,
		reduced: reducedMotion,
	});
	audio.setLevels();
}
function saveBest() {
	if (
		Object.keys(DEFAULT_TUNING).some(
			(k) => world.tuning[k] !== DEFAULT_TUNING[k],
		) ||
		debugOpen
	)
		return;
	const best = storageRead("had-best");
	if (!best || world.time < best.time)
		storageWrite("had-best", { time: world.time, score: world.score });
}
function promptFor(action) {
	const pad = lastInput === "gamepad";
	if (pad) {
		const ps = {
			jet: "✕",
			fire: "R2",
			bomb: "□",
			interact: "△",
			move: "L",
			pause: "≡",
			back: "○",
		};
		const xbox = {
			jet: "A",
			fire: "RT",
			bomb: "X",
			interact: "Y",
			move: "L",
			pause: "≡",
			back: "B",
		};
		const label = (glyphStyle === "ps" ? ps : xbox)[action];
		return '<span class="glyph">' + label + "</span>";
	}
	const map = {
		jet: "SPACE",
		fire: "LMB",
		bomb: "E",
		interact: "F",
		move: "A D",
		pause: "ESC",
		back: "ESC",
	};
	return '<span class="key">' + map[action] + "</span>";
}
function controlsHTML() {
	return (
		"<span>" +
		promptFor("jet") +
		"Jetpack</span><span>" +
		promptFor("fire") +
		"Pulse</span><span>" +
		promptFor("bomb") +
		'Charge <b id="bombCount">' +
		(getPlayer()?.bombs ?? 5) +
		"</b></span><span>" +
		promptFor("interact") +
		"Rescue</span>"
	);
}
function updateInputMode(mode) {
	if (lastInput === mode) return;
	lastInput = mode;
	document.body.classList.toggle("touch-mode", mode === "touch");
	$("controlStrip").innerHTML = controlsHTML();
	$("touchHint").hidden = mode !== "touch" || phase !== "game";
	if (screenType === "guide") setScreen("guide", screenData);
}
function button(text, action, primary = false, extra = "") {
	return (
		'<button class="menu-button ' +
		(primary ? "primary" : "") +
		'" data-action="' +
		action +
		'" ' +
		extra +
		"><span>" +
		text +
		'</span><span class="arrow" aria-hidden="true">↗</span></button>'
	);
}
function panel(title, eyebrow, intro, content, compact = false) {
	return (
		'<section class="panel ' +
		(compact ? "compact" : "") +
		'"><div class="eyebrow">' +
		eyebrow +
		"</div><h1>" +
		title +
		"</h1>" +
		(intro ? '<p class="intro">' + intro + "</p>" : "") +
		content +
		"</section>"
	);
}
function footer(
	action = "back",
	text = "Back",
	note = "Move focus · Select / Enter",
) {
	return (
		'<div class="panel-footer"><button class="panel-back" data-action="' +
		action +
		'">' +
		text +
		"</button><span>" +
		note +
		"</span></div>"
	);
}
function setScreen(type, data = {}) {
	screenType = type;
	screenData = data;
	const el = $("screen");
	el.hidden = false;
	el.className = type === "title" ? "title-screen" : "";
	menuFocus = 0;
	$("hud").hidden = phase === "title" || phase === "waiting";
	$("demoBadge").hidden = true;
	$("touchContext").hidden = true;
	$("touchHint").hidden = true;
	if (type === "title") {
		phase = "title";
		world.titleGroup.visible = true;
		world.status = "idle";
		lastActivity = performance.now();
		const best = storageRead("had-best");
		el.innerHTML =
			'<div class="title-wrap"><div class="division">SUBSURFACE RESCUE DIVISION</div><h1 class="title-logo">H.E.R.O.</h1><div class="title-sub">ANOTHER DAY</div><p class="title-tagline">Three miners missing.<br>One jetpack. Still your shift.</p><nav class="menu-list">' +
			button("Start shift", "start", true) +
			button("Co-op crew", "coop") +
			button("Field guide", "guide") +
			button("Settings", "settings") +
			button("About / Credits", "about") +
			'</nav></div><div class="title-ribbon">EST. 1984 / STILL ON CALL</div><div class="title-bottom"><span>' +
			(best ? "BEST SHIFT " + formatTime(best.time) + " · " : "") +
			'A CAVE RESCUE ADVENTURE · 1–4 PLAYERS</span><div class="title-caption">EVERYBODY GETS HOME.<small>DEEP DOWN, YOU’RE A HERO.</small></div></div>';
	}
	if (type === "pause") {
		el.innerHTML = panel(
			"Take a breather.",
			"SHIFT ON HOLD",
			net.active
				? "Your crew is still on the job."
				: "The mine can wait a moment.",
			'<nav class="menu-list">' +
				button("Resume shift", "resume", true) +
				button("Field guide", "guide") +
				button("Settings", "settings") +
				(!AIHub.active && (!net.active || net.isHost)
					? button("Developer tools", "dev")
					: "") +
				(!AIHub.active ? button("End shift", "quit") : "") +
				"</nav>" +
				footer(
					"resume",
					"Resume",
					net.active ? "Co-op keeps running" : "Your kit is safe here",
				),
			true,
		);
	}
	if (type === "guide") {
		el.innerHTML = panel(
			"A good day to get out.",
			"FIELD GUIDE / 01",
			"Go down. Find the crew. Bring each miner back to the surface lift.",
			'<div class="guide-grid"><div class="guide-card"><span class="guide-icon">↑</span><strong>' +
				promptFor("jet") +
				"Fly the shaft</strong><p>Move with " +
				(lastInput === "gamepad"
					? "the left stick"
					: lastInput === "touch"
						? "your left thumb"
						: "A / D") +
				". Hold " +
				(lastInput === "touch"
					? "your left thumb upward"
					: lastInput === "gamepad"
						? glyphStyle === "ps"
							? "Cross"
							: "A"
						: "Space or W") +
				' to rise. Land on ledges to refill fuel.</p></div><div class="guide-card"><span class="guide-icon">✦</span><strong>' +
				promptFor("fire") +
				"Light them up</strong><p>Aim with " +
				(lastInput === "gamepad"
					? "the right stick"
					: lastInput === "touch"
						? "your right thumb"
						: "the mouse") +
				'. Hold fire to pulse. Bats, crawlers &amp; spore sentries block the way.</p></div><div class="guide-card"><span class="guide-icon">◇</span><strong>' +
				promptFor("bomb") +
				'Short fuse</strong><p>Charges attach to nearby amber rubble. The fuse lasts 1.7 seconds. Plant one, then move clear. Your own blast hurts.</p></div><div class="guide-card"><span class="guide-icon">✚</span><strong>' +
				promptFor("interact") +
				'Nobody left below</strong><p>Get close and rescue a miner. Your tether carries one at a time. Fly them into LAST LIFT to bring them home.</p></div></div><p class="guide-tip">GREEN STATIONS refill your whole kit. Water uses more air. Lava burns. Steam bursts in a rhythm. Three suit recoveries per solo shift. Rescued crew stay safe.</p><p class="guide-tip">TOUCH: left thumb moves &amp; flies; right thumb aims &amp; fires. Rescue is assisted. A charge button appears beside rubble. Couch shares one camera: stay together. P2: arrows move, Right Ctrl flies, Enter fires, Right Shift plants, / rescues.</p>' +
				footer(),
		);
	}
	if (type === "settings") {
		el.innerHTML = panel(
			"Make yourself at home.",
			"SETTINGS",
			"Sound, motion, and the buttons on your pad.",
			'<div class="settings-grid">' +
				sliderRow(
					"Master volume",
					"master",
					audio.masterVolume * 100,
					0,
					100,
					5,
					"%",
				) +
				sliderRow(
					"Music volume",
					"music",
					audio.musicVolume * 100,
					0,
					100,
					5,
					"%",
				) +
				sliderRow(
					"Sound & voices",
					"sfx",
					audio.sfxVolume * 100,
					0,
					100,
					5,
					"%",
				) +
				'<div class="setting-row"><label>Controller glyphs</label><button class="toggle" data-action="glyph">' +
				(glyphStyle === "ps" ? "PlayStation · ✕ ○ □ △" : "Xbox · A B X Y") +
				'</button></div><div class="setting-row"><label>Reduced motion</label><button class="toggle" data-action="motion">' +
				(reducedMotion ? "On" : "Off") +
				'</button></div><div class="setting-row"><label>Display</label><button class="toggle" data-action="fullscreen">' +
				(document.fullscreenElement ? "Exit fullscreen" : "Fullscreen") +
				"</button></div></div>" +
				footer("back", "Back", engineInfo.renderer + " · Three.js r180"),
		);
	}
	if (type === "dev") {
		debugOpen = true;
		el.innerHTML = panel(
			"The engineer’s bench.",
			"LIVE DEVELOPER TOOLS",
			"Changes apply immediately. Tuned shifts do not set a best time.",
			'<div class="settings-grid">' +
				sliderRow(
					"Horizontal speed",
					"moveSpeed",
					world.tuning.moveSpeed,
					2,
					12,
					0.2,
					"",
				) +
				sliderRow(
					"Jet acceleration",
					"jetThrust",
					world.tuning.jetThrust,
					20,
					70,
					1,
					"",
				) +
				sliderRow(
					"Fuel drain / sec",
					"fuelDrain",
					world.tuning.fuelDrain,
					0,
					35,
					1,
					"",
				) +
				sliderRow(
					"Air drain multiplier",
					"airDrain",
					world.tuning.airDrain,
					0,
					3,
					0.1,
					"×",
				) +
				sliderRow(
					"Damage multiplier",
					"damage",
					world.tuning.damage,
					0,
					3,
					0.25,
					"×",
				) +
				sliderRow(
					"Charge blast radius",
					"blastRadius",
					world.tuning.blastRadius,
					2,
					8,
					0.2,
					"",
				) +
				sliderRow(
					"Creature speed",
					"enemySpeed",
					world.tuning.enemySpeed,
					0,
					3,
					0.1,
					"×",
				) +
				'<div class="setting-row"><label>Invulnerable suit</label><button class="toggle" data-action="god">' +
				(world.tuning.god ? "On" : "Off") +
				'</button></div><div class="setting-row"><label>Fly through walls</label><button class="toggle" data-action="noclip">' +
				(world.tuning.noclip ? "On · stick / W S controls height" : "Off") +
				'</button></div></div><div class="button-row"><button class="small-button" data-action="refill">Refill kit</button><button class="small-button" data-action="warp0">Surface</button><button class="small-button" data-action="warp1">Chalk</button><button class="small-button" data-action="warp2">Sump</button><button class="small-button" data-action="warp3">Ember</button><button class="small-button" data-action="clear-gates">Clear rubble</button><button class="small-button" data-action="reset-tuning">Reset defaults</button></div>' +
				footer(
					"pause",
					"Back to pause",
					"Engine: " + engineInfo.renderer + " / Rapier 0.19.3",
				),
		);
	}
	if (type === "coop") {
		el.innerHTML = panel(
			"Bring a spare hero.",
			"CO-OP CREW / 1–4",
			"Share a mine, share the rescue. Each hero has a tether and a kit.",
			'<nav class="menu-list">' +
				button("Host an online crew", "host", true) +
				button("Join with a room code", "join") +
				button("Couch crew · 2 players", "couch") +
				'</nav><p class="guide-tip">Online uses a room code &amp; WebRTC. Same-browser tabs also connect locally. Couch play: two controllers, or WASD + arrow keys.</p>' +
				footer(),
			true,
		);
	}
	if (type === "join") {
		el.innerHTML = panel(
			"What’s the code?",
			"JOIN A CREW",
			"Ask the host for the six-character room code.",
			'<input class="room-input" id="roomCode" maxlength="6" placeholder="ABC234" autocomplete="off" aria-label="Six-character room code"><nav class="menu-list">' +
				button("Join crew", "join-submit", true) +
				"</nav>" +
				footer("coop", "Back"),
			true,
		);
	}
	if (type === "room") {
		el.innerHTML = panel(
			"Your crew. Your shift.",
			"CO-OP ROOM / HOST",
			"Share this code. Players can join before or during the shift.",
			'<div class="room-code">' +
				escapeHTML(net.room) +
				'</div><p id="roomStatus" class="room-status">Local room ready · Connecting the online broker…</p><nav class="menu-list">' +
				button("Begin shift", "room-begin", true) +
				button("Copy invite", "copy-room") +
				button("Close room", "close-room") +
				"</nav>" +
				footer("close-room", "Back", "Up to four heroes"),
			true,
		);
	}
	if (type === "joining") {
		el.innerHTML = panel(
			"Calling the lift…",
			"CO-OP ROOM / JOINING",
			"Room " + escapeHTML(net.room),
			'<p id="roomStatus" class="room-status">Looking for the host. Keep this page open.</p><nav class="menu-list">' +
				button("Cancel", "close-room") +
				"</nav>",
			true,
		);
	}
	if (type === "joined") {
		el.innerHTML = panel(
			"You’re on the crew.",
			"CO-OP ROOM / CONNECTED",
			"Room " + escapeHTML(net.room) + " · Hero " + (myId + 1),
			'<p class="room-status">Waiting for the host to begin the shift. Your kit is ready.</p><nav class="menu-list">' +
				button("Leave crew", "close-room") +
				"</nav>",
			true,
		);
	}
	if (type === "result") {
		const won = data.won;
		el.innerHTML = panel(
			won ? "Everybody clocked out." : "End of the shift.",
			won ? "RESCUE COMPLETE / 03 OF 03" : "SURFACE RECOVERY / SUIT OFFLINE",
			won
				? "Three helmets back in the lift. A good day’s work."
				: "The mine got the better of you. The rescue division has another kit.",
			'<div class="result-score"><div class="stat"><b>' +
				world.rescued +
				' / 3</b><span>CREW HOME</span></div><div class="stat"><b>' +
				formatTime(world.time) +
				'</b><span>SHIFT TIME</span></div><div class="stat"><b>' +
				world.score.toLocaleString() +
				'</b><span>POINTS</span></div></div><p class="intro">' +
				world.kills +
				" creatures cleared · " +
				world.charges +
				' charges planted</p><nav class="menu-list">' +
				(!net.active
					? button("Another shift", "start", true)
					: net.isHost
						? button("Another shift together", "room-restart", true)
						: "") +
				button("Return to title", "quit") +
				"</nav>",
			true,
		);
	}
	if (type === "about") renderAbout(data.tab || 0);
	wireMenu();
	updateMarkers();
}
function sliderRow(label, key, value, min, max, step, suffix) {
	const v = Number(value.toFixed(2));
	return (
		'<div class="setting-row"><label for="slider-' +
		key +
		'">' +
		label +
		'</label><input id="slider-' +
		key +
		'" type="range" data-slider="' +
		key +
		'" min="' +
		min +
		'" max="' +
		max +
		'" step="' +
		step +
		'" value="' +
		v +
		'" aria-label="' +
		label +
		'"><output>' +
		v +
		suffix +
		"</output></div>"
	);
}
function renderAbout(tab = 0) {
	const info = INTERVIEW || {
		sourceInformation: { source: "H.E.R.O. (1984)", usage: "added on import" },
		testingFeedback: ["unknown"],
		engineFeedback: ["unknown"],
		promptFeedback: ["unknown"],
	};
	const sq = [
		"Date",
		"Source",
		"Plan",
		"Genre",
		"Perspective",
		"Tech",
		"Art Direction",
		"Animation",
		"Audio",
		"Online",
		"Testing",
		"Research",
		"Environment",
		"Model",
		"Usage",
	];
	const sk = [
		"date",
		"source",
		"plan",
		"genre",
		"perspective",
		"tech",
		"artDirection",
		"animation",
		"audio",
		"online",
		"testing",
		"research",
		"environment",
		"model",
		"usage",
	];
	const qs = [
		[],
		[
			"How many issues did testing catch?",
			"How many were critical / game breaking?",
			"Most helpful test?",
			"Least helpful test?",
		],
		[
			"What did you like most about the engine?",
			"Did you get stuck or guess wrong?",
			"Most important thing you built yourself?",
			"Hardest part of using the engine?",
			"Engine changes, and why?",
			"One thing you would change?",
		],
		[
			"What did you like most about the prompt?",
			"What was confusing?",
			"What was hardest?",
			"What would you change?",
		],
	];
	const content =
		tab === 0
			? sq
					.map(
						(q, i) =>
							'<div class="credit-line"><b>' +
							q +
							"</b><span>" +
							escapeHTML(info.sourceInformation[sk[i]] || "unknown") +
							"</span></div>",
					)
					.join("")
			: info[["", "testingFeedback", "engineFeedback", "promptFeedback"][tab]]
					.map(
						(a, i) =>
							'<div class="feedback"><strong>' +
							qs[tab][i] +
							"</strong><p>" +
							escapeHTML(a) +
							"</p></div>",
					)
					.join("");
	$("screen").innerHTML = panel(
		"The people below the pixels.",
		"ABOUT / CREDITS",
		"An original rescue adventure inspired by H.E.R.O. (1984). Design, models, animation and sound made in code.",
		'<div class="tabs">' +
			[
				"Source Information",
				"Testing Feedback",
				"Engine Feedback",
				"Prompt Feedback",
			]
				.map(
					(label, i) =>
						'<button class="tab ' +
						(i === tab ? "active" : "") +
						'" data-action="tab' +
						i +
						'">' +
						label +
						"</button>",
				)
				.join("") +
			'</div><div class="credits-content" id="creditsContent">' +
			content +
			'<p class="guide-tip">Three.js © Three.js authors · MIT. Rapier © Dimforge · Apache 2.0. AI Hub session client 1.4.0. PeerJS 1.5.5 · MIT (online rooms).</p></div>' +
			footer("back", "Back", "Right stick / PgUp PgDn to scroll."),
	);
}
function wireMenu() {
	const els = menuElements();
	els.forEach((e, i) => {
		e.addEventListener("pointerenter", () => focusMenu(i, false));
		e.addEventListener("focus", () => focusMenu(i, false));
	});
	if (els.length) focusMenu(Math.min(menuFocus, els.length - 1), false);
}
function menuElements() {
	return [
		...$("screen").querySelectorAll("button:not([disabled]), input"),
	].filter((e) => e.getClientRects().length);
}
function focusMenu(index, scroll = true) {
	const els = menuElements();
	if (!els.length) return;
	menuFocus = (index + els.length) % els.length;
	for (const e of els) {
		e.classList.remove("focused");
		e.closest(".setting-row")?.classList.remove("focused");
	}
	const e = els[menuFocus];
	e.classList.add("focused");
	e.closest(".setting-row")?.classList.add("focused");
	if (scroll) e.scrollIntoView({ block: "nearest", behavior: "instant" });
}
function navigateMenu(direction) {
	focusMenu(menuFocus + direction);
	audio.effect("click");
}
function adjustMenu(direction) {
	const e = menuElements()[menuFocus];
	if (e?.matches('input[type="range"]')) {
		e.value = clamp(
			Number(e.value) + direction * Number(e.step),
			Number(e.min),
			Number(e.max),
		);
		e.dispatchEvent(new Event("input", { bubbles: true }));
	} else if (e?.classList.contains("toggle")) e.click();
	else if (screenType === "about") {
		const tab = clamp((screenData.tab || 0) + direction, 0, 3);
		setScreen("about", { tab });
	} else if (e?.id === "roomCode") e.focus();
}
function activateMenu() {
	const e = menuElements()[menuFocus];
	if (e?.id === "roomCode") e.focus();
	else if (e?.matches('input[type="range"]')) return;
	else e?.click();
}
function closeScreen() {
	screenType = null;
	$("screen").hidden = true;
	$("hud").hidden = false;
	world.titleGroup.visible = false;
	$("controlStrip").innerHTML = controlsHTML();
	$("touchHint").hidden = lastInput !== "touch";
}
function goBack() {
	if (screenType === "title") return;
	if (["coop", "join"].includes(screenType)) {
		setScreen(screenType === "join" ? "coop" : "title");
		return;
	}
	if (["room", "joining", "joined"].includes(screenType)) {
		if (!AIHub.active) {
			net.close();
			phase = "title";
			setScreen("title");
		}
		return;
	}
	if (screenType === "pause") {
		closeScreen();
		return;
	}
	setScreen(returnScreen === "title" ? "title" : "pause");
}
function pause() {
	if (phase === "attract") {
		exitAttract();
		return;
	}
	if (phase !== "game" || ended) return;
	if (screenType) closeScreen();
	else {
		pointer.fire = false;
		setScreen("pause");
	}
}
function startGame(count = 1) {
	if (AIHub.active) return;
	net.close();
	localPlayers = count;
	myId = 0;
	world.demo = false;
	pointer.active = false;
	world.reset(count === 2 ? [0, 1] : [0]);
	phase = "game";
	hubFinished = false;
	debugOpen = false;
	returnScreen = "pause";
	closeScreen();
	toast("THREE MINERS MISSING · Head right to the shaft.", 4);
	audio.voice(0);
}
$("screen").addEventListener("click", async (e) => {
	const b = e.target.closest("[data-action]");
	if (!b) return;
	const action = b.dataset.action;
	audio.unlock().catch(() => {});
	audio.effect("click");
	if (action === "start") startGame(1);
	if (action === "couch") startGame(2);
	if (action === "resume") {
		closeScreen();
	}
	if (action === "pause") setScreen("pause");
	if (["guide", "settings", "about", "dev"].includes(action)) {
		if (screenType === "title" || screenType === "coop") returnScreen = "title";
		else if (screenType === "pause") returnScreen = "pause";
		setScreen(action);
	}
	if (action === "back") goBack();
	if (action === "quit" && !AIHub.active) {
		net.close();
		world.demo = false;
		phase = "title";
		setScreen("title");
	}
	if (action === "coop") setScreen("coop");
	if (action === "host") await net.openRoom();
	if (action === "join") setScreen("join");
	if (action === "join-submit") {
		const code = $("roomCode").value.trim();
		if (code.length !== 6) {
			toast("Use the six-character room code.", 3);
			return;
		}
		await net.joinRoom(code);
	}
	if (action === "room-begin") net.begin();
	if (action === "close-room") {
		net.close();
		phase = "title";
		setScreen("title");
	}
	if (action === "copy-room") {
		const link =
			location.protocol === "file:"
				? net.room
				: location.href.split("?")[0] + "?room=" + net.room;
		try {
			await navigator.clipboard.writeText(link);
			toast("INVITE COPIED · " + net.room);
		} catch {
			toast("ROOM CODE · " + net.room, 5);
		}
	}
	if (action === "room-restart" && net.isHost) {
		world.reset(world.players.map((p) => p.id));
		net.begin();
	}
	if (action === "glyph") {
		glyphStyle = glyphStyle === "ps" ? "xbox" : "ps";
		saveSettings();
		b.textContent =
			glyphStyle === "ps" ? "PlayStation · ✕ ○ □ △" : "Xbox · A B X Y";
		$("controlStrip").innerHTML = controlsHTML();
	}
	if (action === "motion") {
		reducedMotion = !reducedMotion;
		document.body.classList.toggle("reduced-motion", reducedMotion);
		saveSettings();
		b.textContent = reducedMotion ? "On" : "Off";
	}
	if (action === "fullscreen") {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {
			toast("Fullscreen is unavailable in this view.");
		}
		b.textContent = document.fullscreenElement
			? "Exit fullscreen"
			: "Fullscreen";
	}
	if (action === "god" || action === "noclip") {
		world.tuning[action] = !world.tuning[action];
		b.textContent = world.tuning[action] ? "On" : "Off";
	}
	if (action === "reset-tuning") {
		world.tuning = { ...DEFAULT_TUNING };
		setScreen("dev");
		toast("BALANCE RESTORED · Default values.");
	}
	if (action === "refill") {
		const p = getPlayer();
		if (p) {
			p.refillCool = 0;
			world.refill(p, true);
		}
		toast("KIT TOPPED UP");
	}
	if (action.startsWith("warp")) {
		const p = getPlayer();
		const locations = [
			[-11.8, 3],
			[1, -7],
			[-1, -22],
			[1, -43],
		];
		const target = locations[Number(action.at(-1))];
		if (p && target) world.setPosition(p, ...target);
		toast("POSITION UPDATED");
	}
	if (action === "clear-gates") {
		world.gates.forEach((g) => world.openGate(g));
		toast("ALL PASSAGES CLEAR");
	}
	if (action.startsWith("tab")) {
		setScreen("about", { tab: Number(action.slice(3)) });
	}
});
$("screen").addEventListener("input", (e) => {
	const key = e.target.dataset.slider;
	if (!key) return;
	const v = Number(e.target.value);
	const suffix = ["master", "music", "sfx"].includes(key)
		? "%"
		: ["airDrain", "damage", "enemySpeed"].includes(key)
			? "×"
			: "";
	e.target.nextElementSibling.textContent = v + suffix;
	if (key === "master") audio.masterVolume = v / 100;
	else if (key === "music") audio.musicVolume = v / 100;
	else if (key === "sfx") audio.sfxVolume = v / 100;
	else world.tuning[key] = v;
	saveSettings();
});
$("pauseButton").addEventListener("click", () => {
	audio.unlock().catch(() => {});
	pause();
});
const pressed = new Set();
const padBombQueue = [];
let pendingTouchBomb = false,
	pendingTouchInteract = false;
let padInputs = [];
function activity(type) {
	lastActivity = performance.now();
	if (type) updateInputMode(type);
}
function exitAttract() {
	world.demo = false;
	document.body.classList.remove("attract-mode");
	world.reset([0]);
	phase = "title";
	setScreen("title");
	$("demoBadge").hidden = true;
	keys.clear();
	pressed.clear();
	pointer.fire = false;
}
function interceptDemo(e) {
	if (phase === "attract") {
		exitAttract();
		e.preventDefault();
		e.stopImmediatePropagation();
		return true;
	}
	return false;
}
window.addEventListener("keydown", (e) => {
	if (interceptDemo(e)) return;
	activity("keyboard");
	audio.unlock().catch(() => {});
	if (ended) return;
	const editing =
		e.target instanceof HTMLInputElement && e.target.type !== "range";
	if (editing) {
		if (e.code === "Escape") {
			e.preventDefault();
			goBack();
		} else if (e.code === "Enter" && screenType === "join") {
			e.preventDefault();
			$("screen").querySelector('[data-action="join-submit"]').click();
		}
		return;
	}
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Tab",
		].includes(e.code)
	)
		e.preventDefault();
	if (!keys.has(e.code)) pressed.add(e.code);
	keys.add(e.code);
	if (e.repeat) return;
	if (e.code === "Escape" || e.code === "KeyP") {
		e.preventDefault();
		if (screenType && screenType !== "title") {
			if (screenType === "pause") closeScreen();
			else goBack();
		} else pause();
		return;
	}
	if (screenType) {
		if (e.code === "ArrowUp" || e.code === "KeyW") navigateMenu(-1);
		if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "Tab")
			navigateMenu(e.shiftKey ? -1 : 1);
		if (e.code === "ArrowLeft" || e.code === "KeyA") adjustMenu(-1);
		if (e.code === "ArrowRight" || e.code === "KeyD") adjustMenu(1);
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			activateMenu();
		}
		if (e.code === "PageDown" || e.code === "PageUp")
			$("creditsContent")?.scrollBy(0, e.code === "PageDown" ? 180 : -180);
	}
});
window.addEventListener("keyup", (e) => {
	keys.delete(e.code);
});
window.addEventListener("blur", () => {
	keys.clear();
	pressed.clear();
	pointer.fire = false;
	touches.clear();
	if (phase === "game" && !net.active && !screenType) pause();
});
window.addEventListener(
	"pointerdown",
	(e) => {
		if (interceptDemo(e)) return;
		activity(e.pointerType === "touch" ? "touch" : "keyboard");
		audio.unlock().catch(() => {});
	},
	{ capture: true },
);
window.addEventListener("pointermove", (e) => {
	if (e.pointerType !== "touch") {
		if (phase === "attract") {
			exitAttract();
			return;
		}
		activity("keyboard");
	}
});
window.addEventListener(
	"wheel",
	(e) => {
		if (phase === "attract") interceptDemo(e);
		else activity();
	},
	{ passive: false, capture: true },
);
let canvas = $("game");
function bindCanvasInput() {
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	canvas.addEventListener("pointerdown", (e) => {
		if (phase !== "game" || screenType || ended) return;
		e.preventDefault();
		canvas.setPointerCapture(e.pointerId);
		if (e.pointerType === "touch") {
			const side = e.clientX < innerWidth * 0.5 ? "left" : "right";
			touches.set(e.pointerId, {
				side,
				sx: e.clientX,
				sy: e.clientY,
				x: e.clientX,
				y: e.clientY,
			});
			updateTouchRings();
		} else {
			pointer.x = e.clientX;
			pointer.y = e.clientY;
			pointer.active = true;
			if (e.button === 0) pointer.fire = true;
			if (e.button === 2) pendingTouchBomb = true;
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch") {
			const t = touches.get(e.pointerId);
			if (t) {
				t.x = e.clientX;
				t.y = e.clientY;
				updateTouchRings();
			}
		} else {
			pointer.x = e.clientX;
			pointer.y = e.clientY;
			pointer.active = true;
		}
	});
}
bindCanvasInput();
async function recoverGraphics() {
	if (recoveringGraphics) return;
	recoveringGraphics = true;
	renderer.setAnimationLoop(null);
	const fresh = canvas.cloneNode(false);
	canvas.replaceWith(fresh);
	canvas = fresh;
	bindCanvasInput();
	try {
		renderer.dispose();
		renderer = new THREE.WebGPURenderer({
			canvas,
			antialias: true,
			forceWebGL: true,
		});
		renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		await renderer.init();
		engineInfo.renderer = "WebGL 2 compatibility";
		resize();
		lastFrame = performance.now();
		renderer.setAnimationLoop(frame);
		toast("GRAPHICS RECOVERED · Compatibility renderer active.", 4);
	} catch (error) {
		engineInfo.errors.push(error.message);
		$("bootError").hidden = false;
		$("bootError").textContent =
			"Graphics could not recover. Reopen this game in a browser with WebGPU or WebGL 2.";
	} finally {
		recoveringGraphics = false;
	}
}
function releasePointer(e) {
	pointer.fire = false;
	touches.delete(e.pointerId);
	updateTouchRings();
}
window.addEventListener("pointerup", releasePointer);
window.addEventListener("pointercancel", releasePointer);
function updateTouchRings() {
	$("touchRings").innerHTML = [...touches.values()]
		.map(
			(t) =>
				'<i class="touch-ring" style="left:' +
				t.sx +
				"px;top:" +
				t.sy +
				'px"></i><i class="touch-nub" style="left:' +
				(t.sx + clamp(t.x - t.sx, -45, 45)) +
				"px;top:" +
				(t.sy + clamp(t.y - t.sy, -45, 45)) +
				'px"></i>',
		)
		.join("");
}
$("touchAction").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	const p = getPlayer(),
		action = p && world.interaction(p);
	if (action?.type === "bomb") pendingTouchBomb = true;
	else pendingTouchInteract = true;
});
function pollPads(dt) {
	const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	padInputs = [];
	if (pads.length && !lastPadConnected) {
		lastPadConnected = true;
		if (gameLoaded)
			toast(
				"CONTROLLER READY · " +
					(glyphStyle === "ps"
						? "✕ jetpack · R2 pulse"
						: "A jetpack · RT pulse"),
				3,
			);
	}
	if (!pads.length) lastPadConnected = false;
	pads.forEach((pad, index) => {
		const btn = (n) => !!pad.buttons[n]?.pressed || pad.buttons[n]?.value > 0.5;
		const prev = gamepadPrevious[index] || [];
		const edge = (n) => btn(n) && !prev[n];
		let ax = pad.axes[0] || 0,
			ay = pad.axes[1] || 0;
		ax = Math.abs(ax) > 0.18 ? ax : 0;
		ay = Math.abs(ay) > 0.18 ? ay : 0;
		const rx = pad.axes[2] || 0,
			ry = pad.axes[3] || 0;
		const meaningful =
			!!ax ||
			!!ay ||
			Math.hypot(rx, ry) > 0.2 ||
			pad.buttons.some((b) => b.pressed || b.value > 0.5);
		if (meaningful) {
			if (phase === "attract") {
				exitAttract();
				gamepadPrevious[index] = pad.buttons.map(
					(b) => b.pressed || b.value > 0.5,
				);
				return;
			}
			activity("gamepad");
			audio.unlock().catch(() => {});
			lastPadAction = performance.now();
		}
		if (index === 0 && edge(9) && !btn(8)) {
			if (screenType && screenType !== "title") {
				if (screenType === "pause") closeScreen();
				else goBack();
			} else pause();
		}
		if (screenType && index === 0) {
			const up = btn(12) || ay < -0.5,
				down = btn(13) || ay > 0.5,
				left = btn(14) || ax < -0.5,
				right = btn(15) || ax > 0.5;
			if (menuRepeat <= 0 && (up || down || left || right)) {
				if (up) navigateMenu(-1);
				if (down) navigateMenu(1);
				if (left) adjustMenu(-1);
				if (right) adjustMenu(1);
				menuRepeat = 0.18;
			}
			if (edge(0)) activateMenu();
			if (edge(1)) goBack();
			const sc = $("creditsContent");
			if (sc && Math.abs(ry) > 0.25) sc.scrollTop += ry * dt * 330;
		}
		if (edge(2)) padBombQueue[index] = true;
		padInputs[index] = {
			move: ax || (btn(14) ? -1 : btn(15) ? 1 : 0),
			jet: btn(0) || btn(4),
			down: btn(1) || btn(13),
			fire: btn(7) || btn(5),
			bomb: !!padBombQueue[index],
			interact: btn(3),
			...(Math.hypot(rx, ry) > 0.2 ? { aimX: rx, aimY: -ry } : {}),
			vertical: -ay,
		};
		gamepadPrevious[index] = pad.buttons.map((b) => b.pressed || b.value > 0.5);
	});
	menuRepeat -= dt;
}
function collectInput(index = 0) {
	if (screenType || ended) return zeroInput();
	let input = zeroInput();
	if (index === 0) {
		input.move =
			(keys.has("KeyD") ||
			((!localPlayers || localPlayers === 1) && keys.has("ArrowRight"))
				? 1
				: 0) -
			(keys.has("KeyA") || (localPlayers === 1 && keys.has("ArrowLeft"))
				? 1
				: 0);
		input.jet =
			keys.has("Space") ||
			keys.has("KeyW") ||
			(localPlayers === 1 && keys.has("ArrowUp"));
		input.down =
			keys.has("KeyS") || (localPlayers === 1 && keys.has("ArrowDown"));
		input.fire = pointer.fire || keys.has("KeyJ") || keys.has("KeyZ");
		input.bomb = pressed.has("KeyE") || pressed.has("KeyX") || pendingTouchBomb;
		input.interact = keys.has("KeyF") || pendingTouchInteract;
		if (pointer.active && lastInput === "keyboard") {
			const p = getPlayer();
			if (p) {
				const v = new THREE.Vector3(
					(pointer.x / innerWidth) * 2 - 1,
					(-pointer.y / innerHeight) * 2 + 1,
					0,
				).unproject(camera);
				input.aimX = v.x - p.x;
				input.aimY = v.y - p.y - 0.2;
			}
		}
		if (lastInput === "touch") {
			const l = [...touches.values()].find((t) => t.side === "left"),
				r = [...touches.values()].find((t) => t.side === "right");
			if (l) {
				input.move = clamp((l.x - l.sx) / 42, -1, 1);
				input.jet = l.y - l.sy < -12;
				input.down = l.y - l.sy > 30;
				input.vertical = clamp((l.sy - l.y) / 42, -1, 1);
			}
			if (r) {
				input.fire = true;
				const dx = r.x - r.sx,
					dy = r.sy - r.y;
				if (Math.hypot(dx, dy) > 8) {
					input.aimX = dx;
					input.aimY = dy;
				} else autoAim(input);
			} else autoAim(input);
			input.interact = input.interact || autoInteract > 0.3;
		}
	} else {
		input.move =
			(keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
		input.jet = keys.has("ControlRight") || keys.has("ArrowUp");
		input.down = keys.has("ArrowDown");
		input.fire = keys.has("Enter") || keys.has("Numpad0");
		input.bomb = pressed.has("ShiftRight");
		input.interact = keys.has("Slash");
	}
	if (padInputs[index] && (index > 0 || lastInput === "gamepad")) {
		const p = padInputs[index];
		input.move = Math.abs(p.move) > 0.1 ? p.move : input.move;
		input.jet = p.jet || input.jet;
		input.down = p.down || input.down;
		input.fire = p.fire || input.fire;
		input.bomb = p.bomb || input.bomb;
		input.interact = p.interact || input.interact;
		if (p.aimX !== undefined) {
			input.aimX = p.aimX;
			input.aimY = p.aimY;
		} else if (lastInput === "gamepad") {
			delete input.aimX;
			delete input.aimY;
		}
		if (world.tuning.noclip) input.vertical = p.vertical;
	}
	if (world.tuning.noclip && input.vertical === undefined)
		input.vertical = input.jet ? 1 : input.down ? -1 : 0;
	return input;
}
function autoAim(input) {
	const p = getPlayer();
	if (!p) return;
	const e = world.enemies
		.filter((e) => e.alive && distance(p, e) < 11)
		.sort((a, b) => distance(p, a) - distance(p, b))[0];
	if (e) {
		input.aimX = e.x - p.x;
		input.aimY = e.y - p.y;
	}
}
const attractScript = [
	{ x: -1, y: 3 },
	{ x: 0, y: -6.5 },
	{ x: 2.2, y: -7, action: "bomb", wait: 2.2 },
	{ x: 8, y: -7 },
	{ x: 16, y: -9, action: "rescue" },
	{ x: 1, y: -7 },
	{ x: 1, y: 3 },
	{ x: -11.8, y: 3, wait: 1.2 },
	{ x: 0, y: 2 },
	{ x: 0, y: -22 },
	{ x: -2, y: -22, action: "bomb", wait: 2.2 },
	{ x: -10, y: -22 },
	{ x: -16, y: -25, action: "rescue" },
	{ x: -8, y: -23 },
	{ x: 0, y: -22 },
	{ x: 0, y: 3 },
	{ x: -11.8, y: 3, wait: 1.2 },
	{ x: 0, y: 2 },
	{ x: 0, y: -43 },
	{ x: 2.1, y: -43, action: "bomb", wait: 2.2 },
	{ x: 9, y: -43 },
	{ x: 16, y: -47.3, action: "rescue" },
	{ x: 16, y: -43 },
	{ x: 0, y: -43 },
	{ x: 0, y: 3 },
	{ x: -11.8, y: 3, wait: 3 },
	{ end: true },
];
function startAttract() {
	if (AIHub.active || net.active) return;
	world.demo = true;
	world.reset([0]);
	world.demo = true;
	phase = "attract";
	screenType = null;
	$("screen").hidden = true;
	$("hud").hidden = false;
	$("demoBadge").hidden = false;
	document.body.classList.add("attract-mode");
	attractIndex = 0;
	attractWait = 0;
	world.titleGroup.visible = false;
}
function attractInput(dt) {
	const p = world.players[0];
	p.health = 5;
	p.fuel = 100;
	p.air = 180;
	p.bombs = 5;
	const stage = attractScript[attractIndex];
	if (!stage || stage.end) {
		startAttract();
		return zeroInput();
	}
	const dx = stage.x - p.x,
		dy = stage.y - p.y;
	const input = {
		move: clamp(dx, -1, 1),
		vertical: clamp(dy, -1, 1),
		jet: dy > 0.1,
		fire: true,
		aimX: 1,
		aimY: 0,
	};
	const e = world.enemies
		.filter((e) => e.alive && distance(p, e) < 12)
		.sort((a, b) => distance(p, a) - distance(p, b))[0];
	if (e) {
		input.aimX = e.x - p.x;
		input.aimY = e.y - p.y;
	} else {
		input.aimX = p.face;
		input.aimY = 0;
	}
	if (Math.hypot(dx, dy) < 0.6) {
		if (attractWait === 0) {
			if (stage.action === "bomb") {
				p.face = stage.x < 0 ? -1 : 1;
				world.plantBomb(p);
			}
			if (stage.action === "rescue") world.interact(p);
			attractWait = stage.wait || 0.05;
		}
		attractWait -= dt;
		if (attractWait <= 0) {
			attractIndex++;
			attractWait = 0;
		}
	}
	return input;
}
function updateCamera(dt) {
	let tx = 1.8,
		ty = -5.8;
	const p = getPlayer();
	if (phase !== "title" && phase !== "waiting" && p) {
		tx =
			innerWidth / innerHeight < 1.3
				? clamp(p.x * 0.72, -11, 11)
				: clamp(p.x * 0.4, -6.4, 6.4);
		ty = clamp(p.y + clamp(p.vy * 0.26, -2.8, 1.4), -53.5, -2.2);
	}
	const speed = 1 - Math.exp(-dt * 5);
	camera.position.x = lerp(camera.position.x, tx, speed);
	camera.position.y = lerp(camera.position.y, ty, speed);
	if (shake > 0 && !reducedMotion) {
		camera.position.x += (rnd() - 0.5) * shake * 0.45;
		camera.position.y += (rnd() - 0.5) * shake * 0.35;
		shake = Math.max(0, shake - dt);
	}
	camera.lookAt(camera.position.x, camera.position.y, 0);
	camera.updateMatrixWorld();
}
const markerElements = CREW_DATA.map((c) => {
	const d = document.createElement("div");
	d.className = "marker";
	d.textContent = c.name + " / RESCUE";
	$("markers").appendChild(d);
	return d;
});
const liftMarker = document.createElement("div");
liftMarker.className = "marker lift-marker";
liftMarker.textContent = "↑ LAST LIFT";
$("markers").appendChild(liftMarker);
function markerAt(el, x, y) {
	const v = new THREE.Vector3(x, y, 2).project(camera);
	el.hidden =
		v.x < -0.86 ||
		v.x > 0.86 ||
		v.y < -0.82 ||
		v.y > 0.62 ||
		screenType !== null;
	el.style.left = (v.x * 0.5 + 0.5) * 100 + "%";
	el.style.top = (-v.y * 0.5 + 0.5) * 100 + "%";
}
function updateMarkers() {
	world.crew.forEach((c, i) => {
		markerAt(markerElements[i], c.x, c.y + 1.7);
		if (c.state !== "waiting") markerElements[i].hidden = true;
	});
	markerAt(liftMarker, -11.8, 7.35);
}
function updateHUD(dt) {
	const p = getPlayer();
	if (!p) return;
	const safe = world.rescued;
	$("hearts").innerHTML = Array.from(
		{ length: 5 },
		(_, i) => '<span class="' + (i >= p.health ? "lost" : "") + '">◆</span>',
	).join("");
	$("fuelText").textContent = Math.round(p.fuel) + "%";
	$("fuelFill").style.width = p.fuel + "%";
	$("fuelFill").parentElement.classList.toggle("low", p.fuel < 22);
	$("rescueCount").textContent = safe;
	$("crewDots").innerHTML = world.crew
		.map(
			(c) =>
				'<i class="crew-chip ' +
				(c.state === "safe" ? "safe" : c.state === "carried" ? "carried" : "") +
				'"></i>',
		)
		.join("");
	$("depthText").textContent = String(
		Math.max(0, Math.round((1.3 - p.y) * 3)),
	).padStart(3, "0");
	$("airText").textContent =
		"AIR " +
		formatTime(p.air) +
		" · " +
		p.lives +
		(world.players.length > 1 ? " TEAM SUITS" : " SUITS");
	$("airText").style.color = p.air < 30 ? "var(--red)" : "var(--mint)";
	const bc = $("bombCount");
	if (bc) bc.textContent = p.bombs;
	const sector = p.y > -16 ? 0 : p.y > -35 ? 1 : 2;
	$("sectorNo").textContent = "SECTOR 0" + (sector + 1);
	$("sectorName").textContent = [
		"THE CHALK GALLERIES",
		"THE FLOODED WORKS",
		"THE EMBER CHAMBER",
	][sector];
	$("sectorHint").textContent = [
		"A little light goes a long way.",
		"Keep your head above the overtime.",
		"Mind the heat. Bring the crew home.",
	][sector];
	audio.sector = sector;
	const action = world.interaction(p);
	$("context").hidden = !action || screenType !== null || phase === "attract";
	if (action)
		$("context").innerHTML =
			promptFor(action.type === "bomb" ? "bomb" : "interact") + action.text;
	$("touchContext").hidden =
		lastInput !== "touch" || !action || screenType !== null || phase !== "game";
	if (action)
		$("touchAction").textContent =
			action.type === "bomb"
				? "CHARGE"
				: action.type === "rescue"
					? "RESCUE"
					: action.type === "deliver"
						? "HOME"
						: "REFILL";
	if (lastInput === "touch" && action?.type === "rescue") autoInteract += dt;
	else autoInteract = 0;
	const carrying = p.carrying !== null ? world.crew[p.carrying] : null;
	const next = world.crew
		.filter((c) => c.state === "waiting")
		.sort((a, b) => distance(p, a) - distance(p, b))[0];
	$("objectiveText").textContent = carrying
		? carrying.name + " ON TETHER · Return to LAST LIFT ↑"
		: next
			? "FIND " +
				next.name +
				" · " +
				Math.round(distance(p, next) * 3) +
				" m " +
				(next.y < p.y - 3 ? "↓" : next.x > p.x ? "→" : "←")
			: safe === 3
				? "EVERYBODY HOME · SHIFT COMPLETE"
				: "YOUR CREW HAS THE TETHERS · Cover their ascent";
	const px = clamp((p.x + 19) / 38, 0, 1);
	$("mapPilot").style.left = 12 + px * 69 + "px";
	$("mapPilot").style.top = 30 + clamp((3 - p.y) / 61, 0, 1) * 124 + "px";
	world.crew.forEach((c, i) => {
		$("mapCrew" + (i + 1)).style.background =
			c.state === "safe"
				? "var(--mint)"
				: c.state === "carried"
					? "var(--paper)"
					: "var(--gold)";
	});
	const others = world.players.filter((x) => x.id !== myId);
	$("coopStatus").textContent =
		(net.active
			? net.kind === "hub"
				? "AI HUB · "
				: "ROOM " + net.room + " · "
			: localPlayers === 2
				? "COUCH CREW · "
				: "") +
		(world.players.length > 1
			? world.players.length + " HEROES ON SHIFT"
			: "") +
		(others.length
			? "\n" +
				others
					.map(
						(p) =>
							"H" +
							(p.id + 1) +
							" " +
							(p.carrying !== null
								? "TETHERING " + world.crew[p.carrying].name
								: Math.max(0, Math.round((1.3 - p.y) * 3)) + " m"),
					)
					.join(" / ")
			: "");
	updateMarkers();
}
function tick(dt) {
	if (ended) return;
	const input = collectInput(0);
	if (net.active && !net.isHost) {
		net.queuedBomb = net.queuedBomb || input.bomb;
		net.queuedInteract = net.queuedInteract || input.interact;
	}
	let canSim = phase === "game" && (!screenType || net.active);
	if (AIHub.active) canSim = canSim && hubStarted && AIHub.time() >= 0;
	if (phase === "attract") {
		world.step(dt, { 0: attractInput(dt) });
		if (world.status === "won") {
			attractWait += dt;
			if (attractWait > 3) startAttract();
		}
	} else if (canSim && (!net.active || net.isHost)) {
		const inputs = {};
		for (const p of world.players) {
			if (p.id === myId && !AIHub.server) inputs[p.id] = input;
			else if (!net.active && localPlayers === 2)
				inputs[p.id] = collectInput(1);
			else
				inputs[p.id] =
					performance.now() - (net.inputAt[p.id] || 0) < 800
						? net.inputs[p.id]
						: zeroInput();
		}
		world.step(dt, inputs);
	}
	networkTimer += dt;
	if (
		net.active &&
		networkTimer >= 0.1 &&
		(phase === "game" ||
			phase === "waiting" ||
			phase === "won" ||
			phase === "lost")
	) {
		networkTimer = 0;
		net.tick(0.1, input);
	}
	if (
		phase === "title" &&
		screenType === "title" &&
		performance.now() - lastActivity > 10000 &&
		!AIHub.active
	)
		startAttract();
}
function frame(now) {
	let stepped = false;
	const dt = Math.min(0.06, (now - lastFrame) / 1000);
	lastFrame = now;
	pollPads(dt);
	audio.update();
	if (!manual) {
		accumulator += dt;
		while (accumulator >= 1 / 60) {
			tick(1 / 60);
			stepped = true;
			accumulator -= 1 / 60;
		}
	}
	world.animate(dt);
	updateCamera(dt);
	uiTimer += dt;
	if (uiTimer > 0.09) {
		updateHUD(uiTimer);
		uiTimer = 0;
	}
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").classList.remove("show");
	}
	if (stepped) {
		pressed.clear();
		padBombQueue.fill(false);
		pendingTouchBomb = false;
		pendingTouchInteract = false;
	}
	try {
		if (renderEnabled) renderer.render(scene, camera);
	} catch (e) {
		engineInfo.errors.push(e.message);
		if (engineInfo.errors.length === 1) console.error(e);
	}
}
const info = await hubConnection;
if (info) {
	await net.hub(info);
	AIHub.ready();
} else {
	setScreen("title");
	const roomParam = new URLSearchParams(location.search).get("room");
	if (roomParam && /^[A-Z0-9]{6}$/i.test(roomParam)) {
		phase = "title";
		setScreen("join");
		$("roomCode").value = roomParam.toUpperCase();
	}
}
$("controlStrip").innerHTML = controlsHTML();
if (navigator.maxTouchPoints > 0 && matchMedia("(pointer:coarse)").matches)
	updateInputMode("touch");
$("loading").hidden = true;
gameLoaded = true;
window.__gameReady = true;
window.__game = {
	engine: engineInfo,
	state() {
		return {
			phase,
			screen: screenType,
			input: lastInput,
			glyphs: glyphStyle,
			localPlayers,
			manual,
			net: {
				active: net.active,
				kind: net.kind,
				isHost: net.isHost,
				room: net.room,
				id: myId,
			},
			tuning: { ...world.tuning },
			...world.snapshot(),
		};
	},
	testing: {
		manual(value = true) {
			manual = value;
			accumulator = 0;
		},
		freezeRendering(value = true) {
			renderEnabled = !value;
		},
		start(count = 1) {
			startGame(count);
		},
		step(frames = 1, input = {}, id = myId) {
			for (let i = 0; i < frames; i++) world.step(1 / 60, { [id]: input });
			world.animate(1 / 60);
			updateCamera(1 / 60);
			updateHUD(1 / 60);
			return window.__game.state();
		},
		tick(frames = 1) {
			for (let i = 0; i < frames; i++) tick(1 / 60);
			world.animate(1 / 60);
			updateHUD(1 / 60);
			return window.__game.state();
		},
		position(x, y, id = myId) {
			const p = world.players.find((p) => p.id === id);
			world.setPosition(p, x, y);
			world.animate(1 / 60);
			return { x: p.x, y: p.y };
		},
		tune(values) {
			Object.assign(world.tuning, values);
		},
		hurt(amount = 1, id = myId) {
			const p = world.players.find((p) => p.id === id);
			p.invuln = 0;
			world.hurt(p, amount, "test");
		},
		interact(id = myId) {
			return world.interact(world.players.find((p) => p.id === id));
		},
		bomb(id = myId) {
			return world.plantBomb(world.players.find((p) => p.id === id));
		},
		setAim(x, y, id = myId) {
			const p = world.players.find((p) => p.id === id);
			const n = Math.hypot(x, y);
			p.aimX = x / n;
			p.aimY = y / n;
			p.face = x < 0 ? -1 : 1;
		},
		killEnemies() {
			for (const e of world.enemies) if (e.alive) world.hitEnemy(e, 10, myId);
		},
		refill(id = myId) {
			const p = world.players.find((p) => p.id === id);
			world.refill(p, true);
		},
		idle() {
			lastActivity = performance.now() - 11000;
		},
		attract() {
			startAttract();
		},
		menu(type) {
			if (type === "pause") phase = "game";
			setScreen(type);
		},
		closeMenu() {
			closeScreen();
		},
		audioProbe() {
			return audio.probe();
		},
		inputDiagnostics() {
			return {
				touches: [...touches.values()],
				pointer: { ...pointer },
				lastInput,
				phase,
				screenType,
				visibility: document.visibilityState,
			};
		},
		audioStats() {
			return {
				music: audio.musicVolume,
				enabled: audio.enabled,
				voices: audio.voicesPlayed,
				sfx: audio.soundsPlayed,
				notes: audio.musicNotes,
			};
		},
		roomHost(code, localOnly = true) {
			return net.openRoom(code, localOnly);
		},
		roomJoin(code, localOnly = true) {
			return net.joinRoom(code, localOnly);
		},
		roomBegin() {
			net.begin();
		},
		roomClose() {
			net.close();
		},
		async render() {
			updateCamera(1);
			world.animate(0.016);
			updateHUD(0.1);
			await renderer.compileAsync(scene, camera);
			renderer.render(scene, camera);
		},
		rawWorld: world,
	},
};
renderer.setAnimationLoop(frame);

window.addEventListener("pagehide", () => {
	if (net.kind === "room") net.close();
});
