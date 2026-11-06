let peerLoader = null;
function loadPeer() {
	if (window.Peer) return Promise.resolve(window.Peer);
	if (peerLoader) return peerLoader;
	peerLoader = new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
		s.onload = () => resolve(window.Peer);
		s.onerror = () =>
			reject(
				new Error(
					"Internet signaling unavailable. Same-browser rooms still work.",
				),
			);
		document.head.append(s);
	});
	return peerLoader;
}
function roomStatus(text) {
	roomNotice = text;
	const e = $("room-notice");
	if (e) e.textContent = text;
}
function appendParticipant(member) {
	if (S.players.some((p) => p.id === member.id)) return;
	const p = preparePlayer(member.id, member.name, member.color),
		near = localPlayer()?.pos || { x: 0, y: 0, z: 8 };
	p.pos = { x: near.x + 0.8, y: near.y, z: near.z + 0.5 };
	p.checkpoint = { ...p.pos };
	p.visual = makeExplorer(p.color);
	playerRoot.add(p.visual.mesh);
	p.body = world.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			p.pos.x,
			p.pos.y + 0.92,
			p.pos.z,
		),
	);
	p.collider = world.createCollider(
		RAPIER.ColliderDesc.capsule(0.52, 0.36),
		p.body,
	);
	p.controller = world.createCharacterController(0.035);
	p.controller.enableAutostep(0.3, 0.2, true);
	p.controller.enableSnapToGround(0.2);
	p.vy = 0;
	p.lastInput = S.time;
	S.players.push(p);
	world.step();
	toast("A PARTNER JOINS THE EXPEDITION");
}
function removeParticipant(id) {
	const p = S.players.find((p) => p.id === id);
	if (!p) return;
	if (p.body) world.removeRigidBody(p.body);
	p.visual?.mesh.parent?.remove(p.visual.mesh);
	S.players = S.players.filter((p) => p.id !== id);
	remoteInputs.delete(id);
}
class RoomBus {
	constructor(code, host) {
		this.code = code;
		this.host = host;
		this.me = host ? 0 : null;
		this.token = crypto.randomUUID();
		this.members = host
			? [{ id: 0, name: "PROFESSOR FINCH", color: COLORS[0] }]
			: [];
		this.tokens = new Map();
		this.nextId = 1;
		this.conns = new Map();
		this.closed = false;
		this.started = false;
		this.lastContact = performance.now();
		try {
			this.channel = new BroadcastChannel("lost-map-room-" + code);
			this.channel.onmessage = (e) => this.receive(e.data, null);
		} catch {}
		this.timer = setInterval(() => {
			if (this.closed) return;
			if (!this.host && this.me === null)
				this.raw({ kind: "hello", token: this.token });
			else this.raw({ kind: "pulse", id: this.me, token: this.token });
			if (
				!this.host &&
				this.me !== null &&
				performance.now() - this.lastContact > 14000
			) {
				roomStatus(
					"The host connection was lost. Return to title to reconnect.",
				);
				if (menu === null) openMenu("lobby");
			}
		}, 1000);
		this.setupInternet();
		if (!host)
			setTimeout(() => this.raw({ kind: "hello", token: this.token }), 50);
	}
	async setupInternet() {
		try {
			const Peer = await loadPeer();
			if (this.closed) return;
			this.peer = new Peer(
				this.host ? "lostmap-expedition-" + this.code : undefined,
				{ debug: 0 },
			);
			this.peer.on("error", (err) => {
				if (!this.closed)
					roomStatus(
						this.me === null
							? "Looking for the room. Check the code, or open its invite link."
							: "This browser’s room is ready. The internet room service is unavailable; try again shortly.",
					);
			});
			this.peer.on("open", () => {
				if (this.closed) return;
				if (this.host)
					roomStatus(
						"Room ready for partners on this browser or another device.",
					);
				else
					this.attach(
						this.peer.connect("lostmap-expedition-" + this.code, {
							reliable: true,
							serialization: "json",
							metadata: { token: this.token },
						}),
					);
			});
			this.peer.on("connection", (c) => this.attach(c));
		} catch (err) {
			if (!this.closed) roomStatus(err.message);
		}
	}
	attach(conn) {
		conn.on("open", () => {
			if (this.closed) {
				conn.close();
				return;
			}
			this.conns.set(conn.peer, conn);
			if (!this.host) conn.send({ kind: "hello", token: this.token });
		});
		conn.on("data", (d) => this.receive(d, conn));
		conn.on("close", () => {
			this.conns.delete(conn.peer);
			if (!this.host)
				roomStatus(
					"Internet peer disconnected. A same-browser connection may still be active.",
				);
		});
		conn.on("error", () =>
			roomStatus(
				"Peer connection interrupted. Rejoin with the same room code.",
			),
		);
	}
	raw(d) {
		if (this.closed) return;
		const data = { ...d, room: this.code, sender: this.token };
		try {
			this.channel?.postMessage(data);
		} catch {}
		for (const c of this.conns.values())
			if (c.open)
				try {
					c.send(data);
				} catch {}
	}
	send(d) {
		this.raw({ ...d, from: this.me });
	}
	receive(d, conn) {
		if (
			this.closed ||
			!d ||
			(d.room && d.room !== this.code) ||
			d.sender === this.token
		)
			return;
		if (d.kind === "hello" && this.host) {
			let id = this.tokens.get(d.token);
			if (id === undefined) {
				if (this.members.length >= 4) {
					this.raw({ kind: "full", to: d.token });
					return;
				}
				id = this.nextId++;
				this.tokens.set(d.token, id);
				const member = {
					id,
					name: ["PROFESSOR FINCH", "DR. REED", "CAPTAIN QUILL", "DOC MARLOW"][
						id % 4
					],
					color: COLORS[id % 4],
				};
				this.members.push(member);
				if (this.started) appendParticipant(member);
			}
			this.raw({
				kind: "welcome",
				to: d.token,
				id,
				members: this.members,
				started: this.started,
			});
			this.raw({ kind: "roster", members: this.members });
			if (menu === "lobby") renderMenu();
			return;
		}
		if (d.kind === "welcome" && !this.host && d.to === this.token) {
			this.me = d.id;
			this.members = d.members;
			this.lastContact = performance.now();
			localId = this.me;
			netActive = true;
			isHost = false;
			roomStatus("Connected. The expedition is ready.");
			if (menu !== "lobby") {
				menu = "lobby";
				renderMenu();
			}
			return;
		}
		if (d.kind === "roster" && !this.host) {
			this.members = d.members;
			if (menu === "lobby") renderMenu();
			return;
		}
		if (d.kind === "full" && d.to === this.token) {
			roomStatus("This expedition already has four explorers.");
			return;
		}
		if (d.kind === "pulse") {
			if (!this.host && d.id === 0) this.lastContact = performance.now();
			return;
		}
		if (d.kind === "world" && !this.host && this.me !== null) {
			this.lastContact = performance.now();
			if (menu === "lobby" || S.mode === "title") {
				$("title-screen").classList.add("hidden");
				$("modal").classList.add("hidden");
				$("hud").classList.remove("hidden");
				menu = null;
			}
			receiveSnapshot(d);
			return;
		}
		if (d.kind === "input" && this.host) {
			acceptInput(d, d.from);
			return;
		}
		if (d.kind === "bye" && this.host) {
			this.members = this.members.filter((p) => p.id !== d.from);
			removeParticipant(d.from);
			this.raw({ kind: "roster", members: this.members });
			if (menu === "lobby") renderMenu();
			return;
		}
		if (d.kind === "host-left" && !this.host) {
			this.close();
			standalone = null;
			netActive = false;
			returnTitle();
			toast("THE HOST CLOSED THE EXPEDITION");
			return;
		}
	}
	close() {
		if (this.closed) return;
		this.raw({ kind: this.host ? "host-left" : "bye", from: this.me });
		this.closed = true;
		clearInterval(this.timer);
		this.channel?.close();
		for (const c of this.conns.values()) c.close();
		this.peer?.destroy();
	}
}
async function createRoom() {
	standalone?.close();
	const a = new Uint32Array(1);
	crypto.getRandomValues(a);
	const code = String(100000 + (a[0] % 900000));
	S.mode = "lobby";
	standalone = new RoomBus(code, true);
	netActive = true;
	isHost = true;
	localId = 0;
	lastSnapshot = 0;
	roomNotice = "Creating the expedition room…";
	openMenu("lobby");
}
async function joinRoom(code) {
	if (!/^\d{6}$/.test(code)) {
		roomStatus("Use the six digits on the host’s screen.");
		return;
	}
	standalone?.close();
	S.mode = "lobby";
	standalone = new RoomBus(code, false);
	isHost = false;
	netActive = true;
	lastSnapshot = 0;
	roomStatus("Looking for expedition " + code + "…");
}
async function initializeHub() {
	if (!AIHub.active) return null;
	hubInfo = await AIHub.connect({ mode: "shared-world", seats: [1, 4] });
	if (!hubInfo) return null;
	netActive = true;
	isHost = AIHub.isHost;
	localId = AIHub.me;
	AIHub.on("message", (data, from) => {
		if (hubEnded) return;
		if (isHost) acceptInput(data, from);
		else if (from === AIHub.host && data.kind === "world")
			receiveSnapshot(data);
	});
	AIHub.on("start", () => {
		hubStarted = true;
		S.mode = "playing";
		menu = null;
		$("modal").classList.add("hidden");
	});
	AIHub.on("leave", ({ id }) => {
		removeParticipant(id);
	});
	AIHub.on("time-up", () => {
		if (isHost) finishHub(!!S.flags.relic);
	});
	AIHub.on("end", () => {
		hubEnded = true;
		S.mode = "ended";
		audio.stop();
		$("modal").classList.add("hidden");
		$("context").classList.add("hidden");
	});
	return hubInfo;
}
