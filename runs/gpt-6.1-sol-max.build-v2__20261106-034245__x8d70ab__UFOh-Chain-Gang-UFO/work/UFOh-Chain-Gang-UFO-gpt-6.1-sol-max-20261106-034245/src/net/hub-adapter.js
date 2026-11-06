// Authoritative shared-world transport. The released session client is a separate,
// unmodified first script in the final page; this adapter never opens a socket.
const SNAPSHOT_INTERVAL = 1 / 8;
const INPUT_INTERVAL = 1 / 10;
const INPUT_TIMEOUT = 0.5;
const MAX_BYTES = 16384;
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const clone = (v) => JSON.parse(JSON.stringify(v));
const finite = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);

export function sanitizeIntent(raw = {}, seq = 0) {
	const mx = clamp(finite(raw.mx), -1, 1);
	const my = clamp(finite(raw.my), -1, 1);
	const length = Math.max(1, Math.hypot(mx, my));
	return {
		mx: mx / length,
		my: my / length,
		aim: Number.isFinite(raw.aim) ? ((raw.aim % TAU) + TAU) % TAU : null,
		fire: raw.fire === true,
		seq: Math.max(0, Math.min(1e12, Math.floor(finite(seq)))),
	};
}

// A tagged tree codec retains every actor and every field. A homogeneous object
// list stores its keys once, rather than once per enemy/projectile. Numeric
// rounding affects presentation only; host collision and scoring keep precision.
function pack(value) {
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return null;
		return Number.isInteger(value) ? value : Math.round(value * 1000) / 1000;
	}
	if (Array.isArray(value)) {
		if (
			value.length > 1 &&
			value.every(
				(item) => item && typeof item === "object" && !Array.isArray(item),
			)
		) {
			const keys = [...new Set(value.flatMap((item) => Object.keys(item)))];
			return [
				2,
				keys,
				value.map((item) =>
					keys.map((key) => (key in item ? pack(item[key]) : [3])),
				),
			];
		}
		return [1, value.map(pack)];
	}
	if (value && typeof value === "object") {
		return [0, Object.entries(value).map(([key, item]) => [key, pack(item)])];
	}
	return value;
}

function unpack(value, depth = 0) {
	if (depth > 40) throw new Error("World packet is nested too deeply.");
	if (!Array.isArray(value)) return value;
	if (value[0] === 0) {
		const out = {};
		for (const [key, item] of value[1]) {
			if (key === "__proto__" || key === "constructor" || key === "prototype") {
				throw new Error("Invalid world packet field.");
			}
			out[key] = unpack(item, depth + 1);
		}
		return out;
	}
	if (value[0] === 1) return value[1].map((item) => unpack(item, depth + 1));
	if (value[0] === 2) {
		const keys = value[1];
		if (!Array.isArray(keys) || keys.length > 256)
			throw new Error("Invalid world table.");
		return value[2].map((row) => {
			const out = {};
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				if (
					key === "__proto__" ||
					key === "constructor" ||
					key === "prototype"
				) {
					throw new Error("Invalid world table field.");
				}
				if (!(Array.isArray(row[i]) && row[i][0] === 3)) {
					out[key] = unpack(row[i], depth + 1);
				}
			}
			return out;
		});
	}
	throw new Error("Unknown world packet encoding.");
}

export function encodeSnapshot(snapshot) {
	// Events are effects, not authority actors. Their monotonic IDs make the recent
	// tail sufficient even when the network repeats a full snapshot.
	const state = { ...snapshot, events: (snapshot.events || []).slice(-24) };
	return pack(state);
}

export function decodeSnapshot(encoded) {
	const state = unpack(encoded);
	if (
		!state ||
		!Array.isArray(state.players) ||
		!Array.isArray(state.enemies) ||
		!Array.isArray(state.shots) ||
		!Number.isFinite(state.t)
	) {
		throw new Error("Incomplete authoritative world packet.");
	}
	return state;
}

function movePresentation(player, intent, dt, balance = {}) {
	if (!player || player.down || player.active === false || dt <= 0)
		return player;
	// Reconcile only steering and orbital aim. Host values still own the ring,
	// hull and score; prediction cannot award a hit or consume a real shield.
	const radius = finite(player.r, 13);
	for (let remaining = dt; remaining > 1e-9; ) {
		const step = Math.min(remaining, 1 / 120);
		remaining -= step;
		player.shield = Math.max(0, finite(player.shield) - step);
		player.cool = Math.max(0, finite(player.cool) - step);
		if (intent.fire && player.cool <= 1e-8) {
			player.shield = finite(balance.recharge, 1.6);
			player.cool = finite(balance.shotInterval, 0.25);
		}
		const speed =
			finite(balance.speed, 230) *
			(player.shield > 0 ? finite(balance.recoverySpeed, 0.5) : 1);
		const response = 1 - Math.exp(-finite(balance.response, 13) * step);
		player.vx =
			finite(player.vx) + (intent.mx * speed - finite(player.vx)) * response;
		player.vy =
			finite(player.vy) + (intent.my * speed - finite(player.vy)) * response;
		player.x = clamp(player.x + player.vx * step, radius, 960 - radius);
		player.y = clamp(player.y + player.vy * step, radius, 540 - radius);
		if (
			(player.x === radius && player.vx < 0) ||
			(player.x === 960 - radius && player.vx > 0)
		)
			player.vx = 0;
		if (
			(player.y === radius && player.vy < 0) ||
			(player.y === 540 - radius && player.vy > 0)
		)
			player.vy = 0;
		let requested = intent.aim;
		if (requested === null && Math.hypot(intent.mx, intent.my) > 0.12)
			requested = (Math.atan2(intent.my, intent.mx) + TAU) % TAU;
		if (requested !== null) player.requested = requested;
		const current = finite(player.bearing);
		const distance =
			(((finite(player.requested, current) - current) % TAU) + TAU) % TAU;
		player.bearing =
			(current +
				Math.min(
					distance < 1e-9 || TAU - distance < 1e-9 ? 0 : distance,
					finite(balance.slew, TAU) * step,
				)) %
			TAU;
	}
	return player;
}

export function createHubAdapter({
	hub = globalThis.AIHub,
	createWorld,
	onWorld = () => {},
	onEnd = () => {},
	onEvent = () => {},
}) {
	let world = null;
	let clock = 0;
	let started = false;
	let connected = false;
	let finished = false;
	let ready = false;
	let snapshotTimer = 0;
	let inputTimer = 0;
	let inputSeq = 0;
	let worldSeq = 0;
	let lastWorldSeq = -1;
	let lastEventId = -1;
	let lastArrival = 0;
	let previous = null;
	let current = null;
	let predicted = null;
	let latestIntent = sanitizeIntent();
	let queuedFire = false;
	let fireHeld = false;
	let pending = [];
	let discardedPackets = 0;
	let sendCount = 0;
	let receiveCount = 0;
	let maxBytes = 0;
	let sentBytes = 0;
	let finalCount = 0;
	let lastError = null;
	const sentTimes = [];
	const members = new Set();
	const inputs = new Map();
	const ack = {};
	const removers = [];
	const adapter = {
		active: false,
		ended: false,
		running: false,
		isHost: false,
		localId: null,
		info: null,
		connect,
		tick,
		getWorld: () => world,
		getPresentation,
		diagnostics,
		dispose,
	};

	function fail(message) {
		lastError = message;
		adapter.running = false;
		queuedFire = false;
		if (hub && typeof hub.fail === "function") hub.fail(message);
	}

	function send(packet, to) {
		if (!adapter.active || adapter.ended || !hub) return false;
		while (sentTimes.length && sentTimes[0] <= clock - 1) sentTimes.shift();
		if (sentTimes.length >= 19) return false;
		let size;
		try {
			size = new TextEncoder().encode(JSON.stringify(packet)).length;
		} catch (error) {
			fail(`Unable to encode world: ${error.message}`);
			return false;
		}
		maxBytes = Math.max(maxBytes, size);
		if (size > MAX_BYTES) {
			fail(`World packet ${size} bytes exceeds the 16384-byte session limit.`);
			return false;
		}
		sentTimes.push(clock);
		sendCount++;
		sentBytes += size;
		return hub.send(packet, { to, reliable: true });
	}

	function eventsFrom(state) {
		if (!adapter.running || adapter.ended) return;
		for (const event of state.events || []) {
			if (Number.isFinite(event.id) && event.id > lastEventId) {
				lastEventId = event.id;
				onEvent(event);
			}
		}
	}

	function broadcast(final = false) {
		if (!world || !adapter.isHost || adapter.ended) return false;
		const snapshot = world.snapshot();
		if (!snapshot.events) snapshot.events = world.events || [];
		return send({
			v: 1,
			t: "w",
			n: ++worldSeq,
			ack,
			final,
			w: encodeSnapshot(snapshot),
		});
	}

	function finish(timeUp = false) {
		if (finished || !adapter.isHost || adapter.ended || !world) return;
		finished = true;
		adapter.running = false;
		queuedFire = false;
		if (timeUp && world.state.status !== "victory") {
			world.state.status = "defeat";
			world.state.resultReason = "time-up";
		}
		broadcast(true);
		const ids = [...members];
		const score = Math.max(0, finite(world.state.score));
		const scores = Object.fromEntries(ids.map((id) => [id, score]));
		const stats = {};
		for (const id of ids) {
			const player = world.state.players.find((p) => p.id === id);
			stats[id] = {
				Contribution: finite(player?.score),
				"Best chain": finite(world.state.bestChain),
			};
		}
		finalCount++;
		hub.finish({
			standings: ids.length ? [ids] : [],
			scores,
			won: world.state.status === "victory",
			stats,
		});
	}

	function receive(packet, from) {
		if (!adapter.active || adapter.ended || !packet || packet.v !== 1) return;
		receiveCount++;
		if (packet.t === "i" && adapter.isHost) {
			const old = inputs.get(from);
			if (
				!members.has(from) ||
				from === adapter.localId ||
				!Number.isSafeInteger(packet.n) ||
				packet.n < 0 ||
				(old && packet.n <= old.seq)
			) {
				discardedPackets++;
				return;
			}
			const intent = sanitizeIntent(packet.i, packet.n);
			inputs.set(from, { intent, seen: clock, seq: packet.n });
			ack[from] = packet.n;
		} else if (packet.t === "w" && !adapter.isHost) {
			if (
				from !== hub.host ||
				!Number.isSafeInteger(packet.n) ||
				packet.n <= lastWorldSeq
			) {
				discardedPackets++;
				return;
			}
			try {
				const snapshot = decodeSnapshot(packet.w);
				if (
					!snapshot.players.every((p) =>
						adapter.info.players.some((m) => m.id === p.id),
					)
				) {
					throw new Error("World packet has an unknown pilot.");
				}
				lastWorldSeq = packet.n;
				previous = current || snapshot;
				current = snapshot;
				lastArrival = clock;
				world.applySnapshot(clone(snapshot));
				const receivedAck = finite(packet.ack?.[adapter.localId], -1);
				pending = pending.filter((sample) => sample.seq > receivedAck);
				const local = current.players.find((p) => p.id === adapter.localId);
				predicted = local ? clone(local) : null;
				const balance = current.balance || world.balance || {};
				let replay = 0;
				for (const sample of current.transition > 0 ||
				current.status !== "running"
					? []
					: pending) {
					const dt = Math.min(sample.dt, Math.max(0, 0.35 - replay));
					movePresentation(predicted, sample.intent, dt, balance);
					replay += dt;
				}
				eventsFrom(snapshot);
				if (packet.final) {
					finished = true;
					adapter.running = false;
					queuedFire = false;
				}
			} catch (error) {
				discardedPackets++;
				lastError = error.message;
			}
		} else {
			discardedPackets++;
		}
	}

	async function connect() {
		if (connected) return adapter.info;
		connected = true;
		if (!hub || typeof hub.connect !== "function") return null;
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) return null;
		adapter.info = info;
		adapter.active = true;
		adapter.isHost = !!hub.isHost;
		adapter.localId =
			hub.server || !info.players.some((p) => p.id === hub.me) ? null : hub.me;
		for (const player of info.players) {
			members.add(player.id);
			inputs.set(player.id, { intent: sanitizeIntent(), seen: clock, seq: -1 });
			ack[player.id] = -1;
		}
		// A cached stream is used only once; shared-world never assumes Math.random
		// has been seeded. The resulting seed is the same in every participant.
		const stream = typeof hub.rng === "function" ? hub.rng("ufoh-world") : null;
		const seed = stream
			? Math.floor(stream() * 0xffffffff) >>> 0
			: info.seed >>> 0;
		world = createWorld({
			seed,
			mode: "mission",
			players: info.players.map(({ id, name }) => ({ id, name })),
			attract: false,
		});
		onWorld(world);
		removers.push(hub.on("message", receive));
		removers.push(
			hub.on("start", () => {
				if (!adapter.ended) started = true;
			}),
			hub.on("leave", ({ id }) => {
				if (adapter.ended || !members.has(id)) return;
				queuedFire = false;
				members.delete(id);
				inputs.delete(id);
				delete ack[id];
				if (id === adapter.localId) {
					latestIntent = sanitizeIntent();
					pending = [];
				}
				if (adapter.isHost && typeof world.removePlayer === "function") {
					world.removePlayer(id);
					broadcast();
				}
			}),
			hub.on("time-up", () => finish(true)),
			hub.on("end", (result = {}) => {
				if (adapter.ended) return;
				adapter.ended = true;
				adapter.running = false;
				inputs.clear();
				latestIntent = sanitizeIntent();
				queuedFire = false;
				fireHeld = false;
				pending = [];
				onEnd(result.reason || "ended");
			}),
		);
		if (!ready && !adapter.ended) {
			ready = true;
			hub.ready();
		}
		return info;
	}

	function tick(dt, localIntent = {}, options = {}) {
		if (
			!adapter.active ||
			adapter.ended ||
			!world ||
			lastError?.startsWith("World packet")
		)
			return;
		dt = clamp(finite(dt), 0, 0.25);
		clock += dt;
		adapter.running = started && hub.time() >= 0 && !finished;
		const fireNow = localIntent.fire === true;
		if (!adapter.running) {
			queuedFire = false;
			fireHeld = fireNow;
			return;
		}
		// A press can fit entirely between two 10 Hz packets. Retain that edge
		// until a successful send, without turning a held button into new presses.
		// Menus and lifecycle gates discard the edge rather than replaying it later.
		if (options.overlay) queuedFire = false;
		else if (
			!adapter.isHost &&
			members.has(adapter.localId) &&
			fireNow &&
			!fireHeld
		)
			queuedFire = true;
		fireHeld = fireNow;
		latestIntent = sanitizeIntent(options.overlay ? {} : localIntent, inputSeq);
		if (adapter.isHost) {
			const intents = {};
			for (const id of members) {
				if (id === adapter.localId) {
					intents[id] = latestIntent;
					ack[id] = inputSeq;
				} else {
					const item = inputs.get(id);
					intents[id] =
						item && clock - item.seen <= INPUT_TIMEOUT
							? item.intent
							: sanitizeIntent();
				}
			}
			world.step(dt, intents);
			eventsFrom({ events: world.events || world.state.events || [] });
			snapshotTimer += dt;
			if (snapshotTimer + 1e-9 >= SNAPSHOT_INTERVAL) {
				snapshotTimer = Math.max(0, snapshotTimer - SNAPSHOT_INTERVAL);
				broadcast();
			}
			if (world.state.status === "victory" || world.state.status === "defeat")
				finish();
		} else if (members.has(adapter.localId)) {
			inputTimer += dt;
			const balance = current?.balance || world.balance || {};
			if (
				!(current?.transition > 0) &&
				(!current || current.status === "running")
			)
				movePresentation(predicted, latestIntent, dt, balance);
			if (inputTimer + 1e-9 >= INPUT_INTERVAL) {
				inputTimer = Math.max(0, inputTimer - INPUT_INTERVAL);
				const packetIntent = {
					...latestIntent,
					fire: latestIntent.fire || queuedFire,
					seq: ++inputSeq,
				};
				if (send({ v: 1, t: "i", n: inputSeq, i: packetIntent }, hub.host)) {
					queuedFire = false;
					pending.push({
						seq: inputSeq,
						intent: packetIntent,
						dt: INPUT_INTERVAL,
					});
					if (pending.length > 60) pending.shift();
				}
			}
		}
	}

	function getPresentation() {
		if (!world) return null;
		if (adapter.isHost || !current) return world.snapshot();
		const snapshot = clone(current);
		const ratio = clamp((clock - lastArrival) / SNAPSHOT_INTERVAL, 0, 1);
		for (const key of ["players", "enemies", "shots", "blasts"]) {
			if (!Array.isArray(snapshot[key])) continue;
			const old = new Map(
				(previous?.[key] || []).map((actor) => [actor.id, actor]),
			);
			for (const actor of snapshot[key]) {
				if (key === "players" && actor.id === adapter.localId && predicted) {
					actor.x = predicted.x;
					actor.y = predicted.y;
					for (const bearing of [
						"bearing",
						"a",
						"angle",
						"requested",
						"targetBearing",
					]) {
						if (bearing in predicted) actor[bearing] = predicted[bearing];
					}
					continue;
				}
				const was = old.get(actor.id);
				if (was && Number.isFinite(actor.x) && Number.isFinite(actor.y)) {
					// Avoid drawing a rescue/teleport as a flight through intervening hazards.
					if (Math.hypot(actor.x - was.x, actor.y - was.y) < 180) {
						actor.x = was.x + (actor.x - was.x) * ratio;
						actor.y = was.y + (actor.y - was.y) * ratio;
					}
				}
			}
		}
		return snapshot;
	}

	function diagnostics() {
		return {
			active: adapter.active,
			isHost: adapter.isHost,
			server: !!hub?.server,
			localId: adapter.localId,
			state: adapter.ended
				? "ended"
				: adapter.running
					? "running"
					: started
						? "countdown"
						: "waiting",
			ready,
			finished,
			sent: sendCount,
			received: receiveCount,
			maxBytes,
			sentBytes,
			discardedPackets,
			finalCount,
			inputSeq,
			queuedFire,
			ack: { ...ack },
			lastWorldSeq,
			lastError,
			members: [...members],
		};
	}

	function dispose() {
		for (const remove of removers) if (typeof remove === "function") remove();
		removers.length = 0;
		inputs.clear();
		adapter.active = false;
		adapter.ended = true;
		adapter.running = false;
		queuedFire = false;
		fireHeld = false;
		pending = [];
	}

	return adapter;
}
