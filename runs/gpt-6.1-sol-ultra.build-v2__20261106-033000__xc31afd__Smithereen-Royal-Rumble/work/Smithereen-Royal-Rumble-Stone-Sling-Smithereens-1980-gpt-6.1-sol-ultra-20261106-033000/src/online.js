/* AI Hub v1 shared-world adapter. Only host advances the production simulation. */
import { createWorld, command as simCommand, step, health } from "./sim.js";

const STEP = 1 / 120;
const PROTOCOL = 1;
const MAX_BYTES = 16000;
const CLOCK_TOLERANCE = 0.65;
const HOLD_TOLERANCE = 0.4;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const q = (n) => Number(Number(n || 0).toFixed(3));
const bytes = (v) => new TextEncoder().encode(JSON.stringify(v)).length;
const safeNumber = (v) => typeof v === "number" && Number.isFinite(v);

/** Exported for deterministic transport/lifecycle tests with an injected Hub. */
export function createOnlineAdapter(app, hub, info) {
	const ids = info.players.map((p) => p.id);
	const seats = new Map(ids.map((id, seat) => [id, seat]));
	const isHost = !!info.isHost;
	const localSeat = info.server ? null : (seats.get(info.me) ?? null);
	const pending = [];
	const unsub = [];
	const acceptedSeq = new Map();
	const receivedBegin = new Map();
	const lastAck = new Map();
	const gone = new Set();
	const diagnostics = {
		sent: 0,
		rejected: 0,
		retries: 0,
		received: 0,
		malformed: 0,
		duplicateCommands: 0,
		blockedCommands: 0,
		commands: 0,
		baselineAcks: 0,
		maxBytes: 0,
		maxSnapshotBytes: 0,
		maxOneSecond: 0,
		queuePeak: 0,
		finishCalls: 0,
		hostTicks: 0,
		started: false,
		ended: false,
		server: !!info.server,
	};
	const sentTimes = [];
	let ended = false;
	let started = false;
	let finished = false;
	let seq = 0;
	let snapshotSeq = 0;
	let appliedSeq = -1;
	let baselineVersion = 0;
	let lastBaseline = -Infinity;
	let lastSnapshot = -Infinity;
	let lastEventsAt = -Infinity;
	let lastEventId = 0;
	let receivedEventId = 0;
	let lastAckAt = -Infinity;
	let tokens = 28;
	let tokenAt = 0;
	let localBegin = null;
	let localChoice = null;
	let localReleasePending = false;
	let releaseSequence = 0;
	let choiceSequence = 0;
	let endAfterFlush = false;
	let finishPayload = null;
	let finalSequence = -1;
	let finishWaitUntil = Infinity;
	let finishGrace = 2;
	let ackPending = false;
	let waitingSnapshot = null;
	const clock = () => Math.max(0, hub.time() / 1000);

	app.mode = "hub";
	app.screen = "play";
	app.hubSeat = localSeat;
	app.hubNames = info.players.map((p) =>
		String(p.name || `Player ${seats.get(p.id) + 1}`),
	);
	app.hubServer = !!info.server;
	app.hubEnded = false;
	app.caption = "The court is assembling. Hold Fire, release to throw.";
	const seed = Number.isFinite(info.seed) ? info.seed : 1;
	app.world = createWorld({
		mode: "hub",
		court: Math.abs(seed) % 5,
		seed,
		limit: 180,
	});
	app.world.limit = 180;
	app.world.players.forEach((p) => {
		p.ai = null;
	});

	function enqueue(data, { to, reliable = true, critical = false } = {}) {
		if (ended) return false;
		let size;
		try {
			size = bytes(data);
		} catch {
			diagnostics.malformed++;
			return false;
		}
		if (size > MAX_BYTES) {
			diagnostics.malformed++;
			return false;
		}
		// State packets supersede older state; intentions/cancels preserve FIFO order.
		if (!reliable) {
			const previous = pending.findIndex(
				(p) =>
					!p.options.reliable && p.data.t === data.t && p.options.to === to,
			);
			if (previous >= 0) pending.splice(previous, 1);
		}
		if (pending.length >= (critical ? 96 : 88)) {
			const expendable = pending.findIndex((p) => !p.options.reliable);
			if (expendable >= 0) pending.splice(expendable, 1);
			else {
				diagnostics.blockedCommands++;
				return false;
			}
		}
		pending.push({
			data,
			size,
			options: { ...(to === undefined ? {} : { to }), reliable },
			critical,
			attempts: 0,
		});
		diagnostics.queuePeak = Math.max(diagnostics.queuePeak, pending.length);
		flush();
		return true;
	}

	function flush() {
		if (ended) return;
		const now = clock();
		tokens = Math.min(28, tokens + Math.max(0, now - tokenAt) * 16);
		tokenAt = now;
		while (pending.length && tokens >= 1) {
			// Reliable FIFO is retained. Leave four tokens for critical release/cancel/final traffic.
			const packet = pending[0];
			if (tokens < 4 && !packet.critical) break;
			const accepted = hub.send(packet.data, packet.options);
			if (!accepted) {
				diagnostics.rejected++;
				packet.attempts++;
				// A transient rejection gets an ordered retry on a later update, never a spin.
				return;
			}
			pending.shift();
			if (packet.attempts) diagnostics.retries++;
			tokens--;
			diagnostics.sent++;
			diagnostics.maxBytes = Math.max(diagnostics.maxBytes, packet.size);
			if (packet.data.t === "s")
				diagnostics.maxSnapshotBytes = Math.max(
					diagnostics.maxSnapshotBytes,
					packet.size,
				);
			sentTimes.push(now);
			while (sentTimes.length && sentTimes[0] <= now - 1) sentTimes.shift();
			diagnostics.maxOneSecond = Math.max(
				diagnostics.maxOneSecond,
				sentTimes.length,
			);
		}
		if (endAfterFlush && !pending.some((p) => p.critical)) finishNow();
	}

	function encodePlayer(p) {
		return [
			p.stone,
			p.charge ? q(p.charge.start) : null,
			p.charge ? q(p.charge.power) : 0,
			p.held ? 1 : 0,
			p.buffer ? 1 : 0,
			q(p.reloadUntil),
			q(p.crewUntil),
			q(p.launcherUntil),
			q(p.protectUntil),
			p.score,
			(p.last || [null, null, null]).map((v) =>
				v ? [q(v.x), q(v.z), v.target || "", q(v.power)] : null,
			),
		];
	}

	function makeSnapshot() {
		const w = app.world;
		return {
			t: "s",
			v: PROTOCOL,
			n: ++snapshotSeq,
			bv: baselineVersion,
			k: w.tick,
			a: q(w.time),
			r: w.revision || 0,
			i: ids.map((id) => acceptedSeq.get(id) || 0),
			b: w.blocks
				.map((b) =>
					(b.alive
						? Math.max(1, Math.round(clamp(b.hp / b.maxHp, 0, 1) * 255))
						: 0
					)
						.toString(36)
						.padStart(2, "0"),
				)
				.join(""),
			p: w.players.map(encodePlayer),
			j: w.projectiles.map((p) => [
				p.id,
				p.throwId,
				p.seat,
				p.type,
				q(p.x),
				q(p.z),
				q(p.vx),
				q(p.vz),
				p.fragment ? 1 : 0,
			]),
			u: w.stats
				? [
						w.stats.shots,
						w.stats.used,
						w.stats.collapses,
						w.stats.crew,
						w.stats.launcher,
					]
				: null,
			o: w.outcome || null,
		};
	}

	function publishBaseline(to) {
		const now = clock();
		const w = app.world;
		// Geometry is regenerated from this validated, versioned content identity. Every state includes all hp values.
		const packet = {
			t: "base",
			v: PROTOCOL,
			bv: ++baselineVersion,
			init: {
				mode: "hub",
				court: w.court,
				bout: w.bout,
				seed,
				limit: 180,
				config: w.config,
			},
			s: null,
		};
		packet.s = makeSnapshot();
		enqueue(packet, { to, reliable: true, critical: true });
		lastBaseline = now;
	}

	function applySnapshot(s) {
		if (
			!s ||
			s.v !== PROTOCOL ||
			!Number.isInteger(s.n) ||
			s.n <= appliedSeq ||
			!Number.isInteger(s.k) ||
			!safeNumber(s.a)
		)
			return;
		const w = app.world;
		if (s.bv > baselineVersion) {
			waitingSnapshot = s;
			return;
		}
		if (
			typeof s.b !== "string" ||
			s.b.length !== w.blocks.length * 2 ||
			!Array.isArray(s.p) ||
			s.p.length !== 2 ||
			!Array.isArray(s.j) ||
			s.j.length > 32
		) {
			diagnostics.malformed++;
			return;
		}
		appliedSeq = s.n;
		w.tick = s.k;
		w.time = s.a;
		w.revision = s.r || 0;
		if (localSeat !== null && Array.isArray(s.i)) {
			if (s.i[localSeat] >= releaseSequence) localReleasePending = false;
			if (s.i[localSeat] >= choiceSequence) localChoice = null;
		}
		w.blocks.forEach((b, i) => {
			const value = parseInt(s.b.slice(i * 2, i * 2 + 2), 36);
			b.alive = value > 0;
			b.hp = b.maxHp * (value / 255);
		});
		s.p.forEach((a, i) => {
			const p = w.players[i];
			if (!Array.isArray(a) || a.length < 11) return;
			p.stone = a[0];
			p.charge = a[1] === null ? null : { start: a[1], power: a[2] };
			p.held = !!a[3];
			p.buffer = !!a[4];
			p.reloadUntil = a[5];
			p.crewUntil = a[6];
			p.launcherUntil = a[7];
			p.protectUntil = a[8];
			p.score = a[9];
			p.last = a[10].map((m) =>
				m ? { x: m[0], z: m[1], target: m[2], power: m[3] } : null,
			);
			if (
				i === localSeat &&
				(p.crewUntil > w.time || p.launcherUntil > w.time)
			) {
				localBegin = null;
				localChoice = null;
				localReleasePending = false;
			}
		});
		w.projectiles = s.j.map((a) => ({
			id: a[0],
			throwId: a[1],
			seat: a[2],
			type: a[3],
			x: a[4],
			z: a[5],
			vx: a[6],
			vz: a[7],
			fragment: !!a[8],
		}));
		if (s.u)
			w.stats = {
				...w.stats,
				shots: s.u[0],
				used: s.u[1],
				collapses: s.u[2],
				crew: s.u[3],
				launcher: s.u[4],
			};
		w.outcome = s.o;
		w.phase = s.o ? "over" : "play";
		if (s.o) {
			app.screen = "result";
			app.caption = "The heralds have the final tally.";
		}
		ackPending = true;
	}

	function receiveBaseline(data) {
		if (
			!data ||
			data.v !== PROTOCOL ||
			!Number.isInteger(data.bv) ||
			data.bv < baselineVersion ||
			!data.init
		)
			return;
		const init = data.init;
		if (
			!Number.isInteger(init.court) ||
			init.court < 0 ||
			init.court > 4 ||
			!Number.isFinite(init.seed)
		)
			return;
		if (data.bv > baselineVersion) {
			app.world = createWorld({ ...init, mode: "hub", limit: 180 });
			app.world.limit = 180;
			app.world.players.forEach((p) => {
				p.ai = null;
			});
			baselineVersion = data.bv;
		}
		applySnapshot(data.s);
		enqueue(
			{ t: "ack", v: PROTOCOL, bv: baselineVersion, n: appliedSeq },
			{ to: info.host, critical: true },
		);
		lastAckAt = clock();
		ackPending = false;
		if (waitingSnapshot && waitingSnapshot.bv <= baselineVersion) {
			const next = waitingSnapshot;
			waitingSnapshot = null;
			applySnapshot(next);
		}
	}

	function validateCommand(data, from) {
		if (
			!isHost ||
			ended ||
			finished ||
			!started ||
			hub.time() < 0 ||
			!seats.has(from) ||
			gone.has(from)
		)
			return;
		if (
			!data ||
			data.v !== PROTOCOL ||
			!Number.isSafeInteger(data.n) ||
			data.n < 1 ||
			!safeNumber(data.at) ||
			!data.c ||
			typeof data.c !== "object"
		) {
			diagnostics.malformed++;
			return;
		}
		const previous = acceptedSeq.get(from) || 0;
		if (data.n <= previous) {
			diagnostics.duplicateCommands++;
			return;
		}
		acceptedSeq.set(from, data.n);
		const seat = seats.get(from);
		const w = app.world;
		const p = w.players[seat];
		const c = data.c;
		if (!["begin", "release", "cancel", "stone"].includes(c.type)) {
			diagnostics.blockedCommands++;
			return;
		}
		if (Math.abs(data.at - clock()) > CLOCK_TOLERANCE && c.type !== "cancel") {
			diagnostics.blockedCommands++;
			if (c.type === "release") {
				receivedBegin.delete(from);
				simCommand(w, seat, { type: "cancel" });
			}
			return;
		}
		if (c.type === "begin") {
			if (
				p.charge ||
				receivedBegin.has(from) ||
				p.crewUntil > w.time ||
				p.launcherUntil > w.time
			) {
				diagnostics.blockedCommands++;
				return;
			}
			const legalStart = Math.max(
				w.time,
				p.reloadUntil || 0,
				p.crewUntil || 0,
				p.launcherUntil || 0,
			);
			const accepted = simCommand(w, seat, { type: "begin" });
			if (accepted !== false)
				receivedBegin.set(from, {
					at: data.at,
					worldAt: legalStart,
					receivedAt: clock(),
				});
		} else if (c.type === "release") {
			const begin = receivedBegin.get(from);
			receivedBegin.delete(from);
			if (!begin || !safeNumber(c.duration) || c.duration < 0) {
				diagnostics.blockedCommands++;
				simCommand(w, seat, { type: "cancel" });
				return;
			}
			// Duration survives asymmetric transport. It cannot exceed measured host hold by more than 400 ms,
			// nor use time that overlapped an authoritative reload/recovery interval.
			const authoritative = Math.max(0, w.time - begin.worldAt);
			const reportedTimeline = Math.max(0, data.at - begin.at);
			const tolerance = Math.min(
				HOLD_TOLERANCE,
				Math.max(0.12, Math.abs(clock() - data.at) + 0.12),
			);
			if (
				Math.abs(c.duration - reportedTimeline) > 0.08 ||
				c.duration > authoritative + tolerance
			) {
				diagnostics.blockedCommands++;
				simCommand(w, seat, { type: "cancel" });
				return;
			}
			const chargeTime = Math.max(0.1, w.config.chargeTime || 1.4);
			const allowed = clamp(
				c.duration - Math.max(0, begin.worldAt - begin.receivedAt),
				0,
				Math.min(chargeTime, authoritative + tolerance),
			);
			simCommand(w, seat, { type: "release", duration: allowed });
		} else if (c.type === "cancel") {
			receivedBegin.delete(from);
			simCommand(w, seat, { type: "cancel" });
		} else if (Number.isInteger(c.stone) && c.stone >= 0 && c.stone < 3) {
			simCommand(w, seat, { type: "stone", stone: c.stone });
		} else diagnostics.blockedCommands++;
		diagnostics.commands++;
	}

	function submit(_seat, c) {
		if (
			ended ||
			finished ||
			!started ||
			hub.time() < 0 ||
			localSeat === null ||
			(app.screen !== "play" && c.type !== "cancel")
		)
			return false;
		if (!c || !["begin", "release", "cancel", "stone"].includes(c.type))
			return false;
		const now = clock();
		let legal = { type: c.type };
		if (c.type === "begin") {
			const p = app.world.players[localSeat];
			if (
				localBegin !== null ||
				p.crewUntil > app.world.time ||
				p.launcherUntil > app.world.time
			)
				return false;
			localBegin = now;
			localReleasePending = false;
		} else if (c.type === "release") {
			if (localBegin === null) return false;
			legal.duration = Math.max(0, now - localBegin);
			localBegin = null;
			localReleasePending = true;
		} else if (c.type === "cancel") {
			localBegin = null;
			localChoice = null;
			localReleasePending = false;
		} else {
			if (
				!Number.isInteger(c.stone) ||
				c.stone < 0 ||
				c.stone > 2 ||
				localBegin !== null
			)
				return false;
			legal.stone = c.stone;
			localChoice = c.stone;
		}
		const data = { t: "c", v: PROTOCOL, n: ++seq, at: q(now), c: legal };
		if (c.type === "release") releaseSequence = seq;
		if (c.type === "stone") choiceSequence = seq;
		if (!isHost && (c.type === "release" || c.type === "cancel")) {
			const p = app.world.players[localSeat];
			p.charge = null;
			p.held = false;
			p.buffer = false;
		}
		if (isHost) validateCommand(data, info.me);
		else
			enqueue(data, {
				to: info.host,
				critical: c.type === "release" || c.type === "cancel",
			});
		return true;
	}

	function publishEvents() {
		const all = (app.world.events || []).filter((e) => e.id > lastEventId);
		if (!all.length) return;
		const ev = all.slice(-48).map((e) => {
			const out = { id: e.id, type: e.type };
			for (const key of [
				"seat",
				"x",
				"z",
				"target",
				"count",
				"stone",
				"throwId",
				"reason",
				"winner",
			])
				if (e[key] !== undefined)
					out[key] = typeof e[key] === "number" ? q(e[key]) : e[key];
			return out;
		});
		lastEventId = all[all.length - 1].id;
		enqueue({ t: "ev", v: PROTOCOL, e: ev }, { reliable: true });
		lastEventsAt = clock();
	}

	function chooseTimeout() {
		const w = app.world;
		if (w.outcome) return;
		const a = health(w, 0),
			b = health(w, 1);
		const winner =
			Math.abs(a - b) > 1e-8
				? a > b
					? 0
					: 1
				: w.players[0].score === w.players[1].score
					? -1
					: w.players[0].score > w.players[1].score
						? 0
						: 1;
		w.outcome = {
			winner,
			reason: "time",
			scores: w.players.map((p) => p.score),
			banked: w.players.map((p, i) => (i === winner ? p.score * w.bout : 0)),
		};
		w.phase = "over";
	}

	function finish() {
		if (!isHost || finished || ended) return;
		finished = true;
		app.world.players.forEach((_, seat) =>
			simCommand(app.world, seat, { type: "cancel" }),
		);
		receivedBegin.clear();
		localBegin = null;
		const w = app.world;
		const present = ids.filter((id) => !gone.has(id));
		const winId = w.outcome?.winner >= 0 ? ids[w.outcome.winner] : null;
		const standings =
			winId === null || !present.includes(winId)
				? [present]
				: [[winId], present.filter((id) => id !== winId)].filter(
						(g) => g.length,
					);
		finishPayload = {
			standings,
			scores: Object.fromEntries(ids.map((id, i) => [id, w.players[i].score])),
		};
		publishEvents();
		const finalState = makeSnapshot();
		finalSequence = finalState.n;
		finishWaitUntil = clock() + finishGrace;
		enqueue(finalState, { reliable: true, critical: true });
		endAfterFlush = true;
		flush();
		app.screen = "result";
	}

	function finishNow() {
		if (!endAfterFlush || ended || !finishPayload) return;
		const confirmed = ids
			.filter((id) => id !== info.me && !gone.has(id))
			.every((id) => (lastAck.get(id)?.n ?? -1) >= finalSequence);
		// Wait for passive clients to apply the final reliable state before the Hub ends their input/audio.
		// A disconnected final ACK cannot consume the five-second time-up grace interval.
		if (!confirmed && clock() < finishWaitUntil) return;
		endAfterFlush = false;
		diagnostics.finishCalls++;
		hub.finish(finishPayload);
	}

	function end(reason) {
		if (ended) return;
		ended = true;
		diagnostics.ended = true;
		pending.length = 0;
		localBegin = null;
		localChoice = null;
		receivedBegin.clear();
		app.hubEnded = true;
		app.hubEndReason = reason || "finished";
		app.world.players.forEach((p) => {
			p.charge = null;
			p.held = false;
			p.buffer = false;
		});
		app.caption =
			reason === "host-left"
				? "The host departed. The court is void."
				: "The round has ended.";
		app.audio?.stop?.();
		app.game?.audio?.stopMusic?.();
		app.game?.audio?.mute?.(true);
		app.input?.clear?.();
		app.ui?.refresh?.();
		app.ui?.update?.(0);
	}

	unsub.push(
		hub.on("start", () => {
			if (ended) return;
			started = true;
			diagnostics.started = true;
			app.caption =
				"Hold Fire to wind. Release to throw. Break the opposing castle!";
			if (isHost) publishBaseline();
		}),
	);
	unsub.push(
		hub.on("message", (data, from) => {
			if (ended || !data || typeof data !== "object") return;
			diagnostics.received++;
			if (isHost && data.t === "c") validateCommand(data, from);
			else if (isHost && data.t === "ack" && seats.has(from)) {
				lastAck.set(from, { bv: data.bv, n: data.n });
				diagnostics.baselineAcks++;
			} else if (!isHost && from === info.host) {
				if (data.t === "base") receiveBaseline(data);
				else if (data.t === "s") applySnapshot(data);
				else if (
					data.t === "ev" &&
					data.v === PROTOCOL &&
					Array.isArray(data.e)
				) {
					const fresh = data.e
						.filter((e) => Number.isInteger(e.id) && e.id > receivedEventId)
						.slice(-48);
					if (fresh.length) {
						receivedEventId = fresh[fresh.length - 1].id;
						app.world.events = [...(app.world.events || []), ...fresh].slice(
							-200,
						);
					}
				}
			}
		}),
	);
	unsub.push(
		hub.on("leave", ({ id }) => {
			if (ended) return;
			gone.add(id);
			if (isHost && id !== info.host && seats.has(id)) {
				const seat = seats.get(id);
				simCommand(app.world, seat, { type: "cancel" });
				receivedBegin.delete(id);
				app.world.outcome = {
					winner: 1 - seat,
					reason: "forfeit",
					scores: app.world.players.map((p) => p.score),
					banked: [0, 0],
				};
				app.world.phase = "over";
				finish();
			}
		}),
	);
	unsub.push(
		hub.on("time-up", ({ graceMs } = {}) => {
			if (isHost && !ended && !finished) {
				finishGrace = Number.isFinite(graceMs)
					? Math.max(0, Math.min(2, graceMs / 1000 - 0.1))
					: 2;
				chooseTimeout();
				finish();
			}
		}),
	);
	unsub.push(hub.on("end", ({ reason }) => end(reason)));

	const adapter = {
		active: true,
		isHost,
		seat: localSeat,
		names: app.hubNames,
		get ended() {
			return ended;
		},
		command: submit,
		update() {
			if (ended) return;
			const now = hub.time() / 1000;
			flush();
			if (!started || now < 0 || !Number.isFinite(now)) return;
			if (isHost && !finished) {
				const targetTick = Math.floor(Math.min(now, app.world.limit) * 120);
				// Time is the Hub clock. Rendering/focus never pauses the authoritative world.
				let iterations = 0;
				while (
					app.world.tick < targetTick &&
					app.world.phase === "play" &&
					iterations++ < 1200
				) {
					step(app.world, STEP);
					diagnostics.hostTicks++;
				}
				// Production interruptions cancel held/charge/buffer directly. Retire their matching
				// network begin, too: the interrupted client's safe release may never send a packet.
				for (const [id] of receivedBegin) {
					const p = app.world.players[seats.get(id)];
					if (!p?.held && !p?.charge && !p?.buffer) receivedBegin.delete(id);
				}
				if (app.world.phase === "over") {
					finish();
					return;
				}
				if (now - lastEventsAt >= 0.17) publishEvents();
				if (now - lastSnapshot >= 0.16) {
					enqueue(makeSnapshot(), { reliable: false });
					lastSnapshot = now;
				}
				if (now - lastBaseline >= 4) publishBaseline();
			} else if (!isHost) {
				// Local charge reacts immediately. Only the host can create a projectile or change collision/score.
				const p = localSeat === null ? null : app.world.players[localSeat];
				if (
					p &&
					localBegin !== null &&
					p.crewUntil <= app.world.time &&
					p.launcherUntil <= app.world.time
				) {
					const usableAt = Math.max(localBegin, p.reloadUntil || 0);
					const power = clamp(
						(now - usableAt) / app.world.config.chargeTime,
						0,
						1,
					);
					p.charge = now >= usableAt ? { start: usableAt, power } : null;
					p.held = true;
					p.buffer = now < usableAt;
				}
				if (p && localReleasePending) {
					p.charge = null;
					p.held = false;
					p.buffer = false;
				}
				if (p && localChoice !== null && !p.charge) p.stone = localChoice;
				if (
					(ackPending || now - lastAckAt >= 1) &&
					now - lastAckAt >= 0.5 &&
					baselineVersion > 0
				) {
					enqueue(
						{ t: "ack", v: PROTOCOL, bv: baselineVersion, n: appliedSeq },
						{ to: info.host },
					);
					lastAckAt = now;
					ackPending = false;
				}
			}
			flush();
		},
		diagnostics() {
			return {
				...diagnostics,
				queue: pending.length,
				appliedSeq,
				baselineVersion,
				lastAck: [...lastAck],
				localReleasePending,
				clock: hub.time(),
				worldTick: app.world.tick,
			};
		},
		dispose() {
			end("session-ended");
			unsub.forEach((remove) => remove?.());
		},
		// Observation-only helpers for test evidence; no mutation controls are exposed to scored input.
		snapshot: makeSnapshot,
	};
	return adapter;
}

export async function connectOnline(app) {
	const hub = globalThis.AIHub;
	if (!hub?.active) return null;
	const info = await hub.connect({ mode: "shared-world", seats: [2, 2] });
	if (!info) return null;
	const adapter = createOnlineAdapter(app, hub, info);
	app.online = adapter;
	hub.ready();
	return adapter;
}
