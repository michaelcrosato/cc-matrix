let hubInfo = null,
	hubStarted = false,
	hubPending = false,
	hubEnded = false,
	club = null,
	roomDigits = [0, 0, 0, 0];
const seatColors = ["#f4bc80", "#82c7ef", "#97ddb5", "#d6b1ec"];
function raceScore() {
	return (
		state.parts.filter(Boolean).length * 1000 +
		(state.friend ? 1000 : 0) +
		(state.signal ? 2500 : 0) +
		(state.mounted ? 1000 : 0) +
		(phaseOrder.indexOf(state.phase) >= 4 ? 2000 : 0) +
		(state.won ? 10000 : 0) +
		state.healed * 100 +
		state.rings * 180 +
		Math.max(0, -body.translation().z)
	);
}
function ownPacket() {
	const p = body.translation();
	return {
		x: +p.x.toFixed(2),
		y: +p.y.toFixed(2),
		z: +p.z.toFixed(2),
		a: +player.root.rotation.y.toFixed(2),
		phase: state.phase,
		mounted: !!state.mounted,
		score: Math.round(raceScore()),
		time: +state.time.toFixed(1),
		won: state.won,
	};
}
function receiveGhost(id, data, name, color) {
	if (
		!data ||
		!["x", "y", "z", "a"].every((k) => Number.isFinite(data[k])) ||
		Math.abs(data.x) > 100 ||
		Math.abs(data.z) > 500 ||
		Math.abs(data.y) > 100 ||
		!phaseOrder.includes(data.phase)
	)
		return;
	let g = ghosts.get(id);
	if (!g) {
		const kid = makeKid(new THREE.Color(color).getHex()),
			b = makeBike(new THREE.Color(color).getHex()),
			root = new THREE.Group();
		root.add(kid.root, b);
		scene.add(root);
		root.traverse((o) => {
			if (o.isMesh) {
				o.material = o.material.clone();
				o.material.transparent = true;
				o.material.opacity = 0.45;
				o.material.depthWrite = false;
			}
		});
		const label = textSprite(String(name).slice(0, 24), color, 0.55);
		label.position.y = 3.7;
		root.add(label);
		g = { root, kid, bike: b, label, data: null, color, name, age: 0 };
		ghosts.set(id, g);
	}
	g.data = data;
	g.age = 0;
	g.root.visible = true;
}
function removeGhost(id) {
	const g = ghosts.get(id);
	if (!g) return;
	scene.remove(g.root);
	g.root.traverse((o) => {
		if (o.isMesh) o.material.dispose();
	});
	const i = mixers.indexOf(g.kid.mixer);
	if (i >= 0) mixers.splice(i, 1);
	ghosts.delete(id);
}
function updateGhosts(dt) {
	const p = body.translation();
	for (const g of ghosts.values()) {
		g.age += dt;
		const d = g.data;
		if (!d) continue;
		g.root.visible =
			g.age < 12 && Math.abs(d.z - p.z) < 95 && d.phase !== "ending";
		g.root.position.lerp(
			new THREE.Vector3(d.x, d.y - 0.85, d.z),
			Math.min(1, dt * 12),
		);
		g.root.rotation.y = d.a;
		g.bike.visible = d.mounted;
		g.kid.rig.position.y = d.mounted ? 0.5 : 0;
		g.kid.walk.paused = d.mounted;
		g.kid.walk.setEffectiveWeight(d.mounted ? 0 : 1);
		g.kid.pedal.paused = !d.mounted;
		g.kid.pedal.setEffectiveWeight(d.mounted ? 1 : 0);
		g.label.quaternion.copy(camera.quaternion);
	}
}
function networkUpdate() {
	if (hubEnded) return;
	if (AIHub.active && hubInfo && hubStarted) {
		AIHub.send(ownPacket(), { reliable: false });
		AIHub.progress({
			score: Math.round(raceScore()),
			label: state.won
				? "Home · " + formatTime(state.time)
				: state.parts.filter(Boolean).length + "/3 pieces · " + state.phase,
		});
	} else if (club?.started) club.send({ kind: "ghost", state: ownPacket() });
}
function finishNetwork(timedOut = false) {
	if (state.reported) return;
	state.reported = true;
	if (AIHub.active && hubStarted) {
		const stats = {
			"Flowers healed": state.healed,
			"Stars touched": state.rings,
			"Close calls": state.catches,
		};
		if (state.won && !timedOut)
			AIHub.result({ time: Math.max(0, Math.round(AIHub.time())), stats });
		else AIHub.result({ score: Math.round(raceScore()), stats });
	} else if (club?.started) club.send({ kind: "ghost", state: ownPacket() });
}
function updateRaceUI() {
	const el = $("#raceStrip");
	if (!((AIHub.active && hubStarted) || club?.started)) {
		el.replaceChildren();
		return;
	}
	el.replaceChildren();
	const own = document.createElement("div");
	own.textContent =
		"YOU · " +
		(state.won
			? "HOME " + formatTime(state.time)
			: state.parts.filter(Boolean).length + "/3 · " + formatTime(state.time));
	el.append(own);
	for (const g of ghosts.values()) {
		const e = document.createElement("div");
		e.style.borderColor = g.color;
		e.textContent =
			g.name +
			" · " +
			(g.data.won
				? "HOME " + formatTime(g.data.time)
				: Math.floor((g.data.score || 0) / 1000) + " ✦");
		el.append(e);
	}
	const results = $("#clubResults");
	if (results && club?.started) {
		results.replaceChildren();
		const riders = [
			{ name: "You", data: ownPacket(), color: seatColors[club.slot] },
			...[...ghosts.values()].map((g) => ({
				name: g.name,
				data: g.data,
				color: g.color,
			})),
		]
			.filter((g) => g.data)
			.sort((a, b) =>
				a.data.won && b.data.won
					? a.data.time - b.data.time
					: a.data.won
						? -1
						: b.data.won
							? 1
							: b.data.score - a.data.score,
			);
		for (const [i, r] of riders.entries()) {
			const row = document.createElement("p");
			row.className = "note";
			row.style.color = r.color;
			row.textContent =
				i +
				1 +
				". " +
				r.name +
				" · " +
				(r.data.won ? "Home in " + formatTime(r.data.time) : "Still riding");
			results.append(row);
		}
	}
}
async function initializeHub() {
	if (!AIHub.active) return false;
	state.screen = "hubWaiting";
	$("#title").classList.add("hidden");
	hubInfo = await AIHub.connect({ mode: "ghost", seats: [1, 4] });
	if (!hubInfo) {
		state.screen = "title";
		showTitle();
		return false;
	}
	AIHub.on("start", () => {
		hubPending = true;
		state.screen = "hubCountdown";
		splash(
			"THE MOONLIGHT CLUB",
			"A little company for the ride.",
			"Your adventure begins together.",
		);
	});
	AIHub.on("message", (data, from) => {
		if (hubEnded) return;
		const p = hubInfo.players.find((p) => p.id === from);
		if (p) receiveGhost(from, data, p.name, p.color);
	});
	AIHub.on("leave", ({ id }) => removeGhost(id));
	AIHub.on("time-up", () => finishNetwork(true));
	AIHub.on("end", () => {
		hubEnded = true;
		hubPending = false;
		state.screen = "hubEnded";
		state.auto = false;
		input.keys.clear();
		audio.mute(true);
		$("#menuLayer").classList.add("hidden");
		$("#tuneOverlay").classList.add("hidden");
		$("#chapterSplash").classList.add("hidden");
	});
	return true;
}

class MoonClub {
	constructor(code, host) {
		this.code = code;
		this.host = host;
		this.uid = crypto.randomUUID();
		this.members = new Map();
		this.connections = new Map();
		this.started = false;
		this.peer = null;
		this.sequence = 0;
		this.seen = new Map();
		this.status = host
			? "Room " + code + " is open on this device. Connecting the wider sky…"
			: "Looking for room " + code + "…";
		this.localOnly = query.has("localNetwork");
		this.channel = new BroadcastChannel("etlaf-room-" + code);
		this.channel.onmessage = (e) => this.receive(e.data, "local");
		this.slot = host ? 0 : 1;
		this.members.set(this.uid, {
			id: this.uid,
			name: host ? "Rider 1" : "A new rider",
			color: seatColors[this.slot],
			slot: this.slot,
		});
		this.helloTimer = setInterval(() => {
			if (!this.started) this.raw({ kind: "hello", host: this.host });
		}, 1200);
		this.heartbeat = setInterval(() => {
			if (this.host) this.announce();
		}, 2500);
		this.raw({ kind: "hello", host });
		this.connectPeer();
	}
	async connectPeer() {
		if (this.localOnly) {
			this.status = this.host
				? "Room " + this.code + " is ready. Local test transport."
				: "Looking for a nearby room…";
			this.refresh();
			return;
		}
		try {
			const { default: Peer } = await import(
				"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm"
			);
			if (this.closed) return;
			this.peer = new Peer(this.host ? "etlaf-night-" + this.code : undefined, {
				debug: 0,
			});
			this.peer.on("open", () => {
				this.status = this.host
					? "Room " +
						this.code +
						" is open. Share the four digits with your friends."
					: "Calling room " + this.code + "…";
				if (!this.host)
					this.addConnection(
						this.peer.connect("etlaf-night-" + this.code, {
							reliable: true,
							metadata: { uid: this.uid },
						}),
					);
				this.refresh();
			});
			this.peer.on("connection", (conn) => {
				if (this.host) this.addConnection(conn);
			});
			this.peer.on("error", (err) => {
				this.status =
					err.type === "unavailable-id"
						? "Those digits are already in use online. Create a new room."
						: this.members.size > 1
							? "Nearby riders are connected. Internet signaling is unavailable."
							: "Internet signaling is unavailable. Nearby tabs can still join this room.";
				this.refresh();
			});
		} catch {
			this.status =
				"Internet signaling is unavailable. Nearby tabs can still join this room.";
			this.refresh();
		}
	}
	addConnection(conn) {
		conn.on("open", () => {
			this.connections.set(conn.peer, conn);
			this.raw({ kind: "hello", host: this.host });
		});
		conn.on("data", (data) => {
			this.receive(data, "peer", conn);
		});
		conn.on("close", () => {
			this.connections.delete(conn.peer);
			if (this.host && conn.metadata?.uid) {
				this.remove(conn.metadata.uid);
				this.announce();
			} else if (!this.host) this.hostGone();
		});
		conn.on("error", () => {
			this.connections.delete(conn.peer);
		});
	}
	raw(msg) {
		if (this.closed) return;
		const packet = { ...msg, uid: this.uid, seq: ++this.sequence };
		this.channel.postMessage(packet);
		for (const c of this.connections.values()) if (c.open) c.send(packet);
	}
	send(msg) {
		this.raw(msg);
	}
	receive(packet, transport, conn) {
		if (
			this.closed ||
			!packet ||
			typeof packet !== "object" ||
			packet.uid === this.uid ||
			typeof packet.uid !== "string" ||
			!Number.isFinite(packet.seq)
		)
			return;
		const previous = this.seen.get(packet.uid) || 0;
		if (packet.seq <= previous) return;
		this.seen.set(packet.uid, packet.seq);
		if (this.host) {
			if (transport === "peer") this.channel.postMessage(packet);
			for (const c of this.connections.values())
				if (c !== conn && c.open) c.send(packet);
		}
		if (packet.kind === "hello") {
			if (this.host && !packet.host) {
				if (!this.members.has(packet.uid) && this.members.size < 4) {
					const taken = new Set([...this.members.values()].map((m) => m.slot)),
						slot = [1, 2, 3].find((i) => !taken.has(i));
					this.members.set(packet.uid, {
						id: packet.uid,
						name: "Rider " + (slot + 1),
						color: seatColors[slot],
						slot,
					});
				}
				this.announce();
			} else if (!this.host && packet.host) this.hostUid = packet.uid;
		} else if (packet.kind === "roster" && !this.host) {
			if (!Array.isArray(packet.members) || packet.members.length > 4) return;
			this.hostUid = packet.uid;
			this.members = new Map(packet.members.map((m) => [m.id, m]));
			const me = this.members.get(this.uid);
			if (!me) {
				this.status =
					"This little club is full. Four riders can share the night.";
			} else {
				this.slot = me.slot;
				this.status =
					"Connected to room " + this.code + ". The host starts the ride.";
			}
			this.refresh();
		} else if (
			packet.kind === "start" &&
			!this.host &&
			packet.uid === this.hostUid
		)
			this.beginRound(packet.at);
		else if (packet.kind === "ghost" && this.started) {
			const m = this.members.get(packet.uid);
			if (m) receiveGhost(packet.uid, packet.state, m.name, m.color);
		} else if (packet.kind === "leave") {
			if (packet.uid === this.hostUid && !this.host) this.hostGone();
			else {
				this.remove(packet.uid);
				if (this.host) this.announce();
			}
		}
	}
	announce() {
		if (!this.host || this.closed) return;
		this.raw({ kind: "roster", members: [...this.members.values()] });
		this.refresh();
	}
	remove(id) {
		this.members.delete(id);
		removeGhost(id);
		this.refresh();
	}
	start() {
		if (!this.host) return;
		const at = Date.now() + 1700;
		this.announce();
		this.raw({ kind: "start", at });
		this.beginRound(at);
	}
	beginRound(at) {
		this.started = true;
		this.startAt = at;
		clearTimeout(this.startTimer);
		this.startTimer = setTimeout(
			() => {
				if (
					!this.closed &&
					this.started &&
					club === this &&
					this.startAt !== null
				) {
					this.startAt = null;
					startGame();
				}
			},
			Math.max(0, at - Date.now()),
		);
		this.status = "The night starts together…";
		menu = "none";
		$("#menuLayer").classList.add("hidden");
		$("#title").classList.add("hidden");
		state.screen = "clubCountdown";
		splash(
			"THE MOONLIGHT CLUB",
			"Same moon. Different bicycles.",
			"Three little things. One big ride home.",
		);
	}
	hostGone() {
		this.started = false;
		this.status = "The host left the club. Your solo adventure can continue.";
		this.hostUid = null;
		toast(this.status, 6);
		if (state.screen === "clubCountdown") showTitle();
	}
	refresh() {
		if (menu === "online") renderOnline();
	}
	leave() {
		if (this.closed) return;
		this.raw({ kind: "leave" });
		this.closed = true;
		clearInterval(this.helloTimer);
		clearInterval(this.heartbeat);
		clearTimeout(this.startTimer);
		this.channel.close();
		this.peer?.destroy();
		for (const id of [...ghosts.keys()]) removeGhost(id);
		if (club === this) club = null;
	}
}
function renderOnline() {
	const room = club;
	if (room) {
		const members = [...room.members.values()].sort((a, b) => a.slot - b.slot);
		panel(
			'<div class="kicker">THE MOONLIGHT CLUB · 1–4 RIDERS</div><h2>Room ' +
				escapeHTML(room.code) +
				"</h2><p>" +
				escapeHTML(room.status) +
				'</p><div class="menu-list">' +
				members
					.map(
						(m) =>
							'<div style="font-size:23px;padding:12px;border-left:3px solid ' +
							m.color +
							'">' +
							escapeHTML(m.name) +
							(m.id === room.uid ? " · you" : "") +
							"</div>",
					)
					.join("") +
				'</div><p class="note">Everyone gets their own adventure. Your friends appear as colored ghost riders. The fastest homecoming wins. No collisions, no chat, just a little company.</p><div class="menu-list">' +
				(room.host ? btn("clubStart", "Ride together", "primary") : "") +
				btn("clubLeave", "Leave the club") +
				"</div>",
		);
		bind("clubStart", () => room.start());
		bind("clubLeave", () => {
			room.leave();
			renderOnline();
		});
		return;
	}
	panel(
		'<div class="kicker">THE MOONLIGHT CLUB</div><h2>The same moon,<br>a little company.</h2><p>Invite up to three friends for a ghost ride. Share four digits, gather the telephone parts, and see who gets their friend home first.</p><div class="menu-list">' +
			btn("createRoom", "Make a room", "primary") +
			'</div><p class="note" style="text-align:center;margin-bottom:8px">Or enter your friend’s four digits. Select a digit to change it. Left / right adjusts it.</p><div class="room-row">' +
			roomDigits
				.map(
					(d, i) =>
						'<button class="room-digit" id="digit' +
						i +
						'" data-digit="' +
						i +
						'">' +
						d +
						"</button>",
				)
				.join("") +
			'</div><div class="menu-list">' +
			btn("joinRoom", "Join this room") +
			'</div><p class="note">Internet play uses WebRTC with PeerJS signaling. Nearby browser tabs can connect directly. Each rider needs the game open; no account is required.</p>' +
			btn("menuBack", "Back", "back"),
	);
	bind("createRoom", () => {
		club?.leave();
		const bytes = new Uint16Array(1);
		crypto.getRandomValues(bytes);
		club = new MoonClub(String(1000 + (bytes[0] % 9000)), true);
		renderOnline();
	});
	bind("joinRoom", () => {
		club?.leave();
		club = new MoonClub(roomDigits.join(""), false);
		renderOnline();
	});
	roomDigits.forEach((_, i) => {
		bind("digit" + i, () => {
			roomDigits[i] = (roomDigits[i] + 1) % 10;
			renderOnline();
			$("#digit" + i).focus();
		});
	});
	bind("menuBack", menuBack);
}
window.addEventListener("beforeunload", () => club?.leave());
