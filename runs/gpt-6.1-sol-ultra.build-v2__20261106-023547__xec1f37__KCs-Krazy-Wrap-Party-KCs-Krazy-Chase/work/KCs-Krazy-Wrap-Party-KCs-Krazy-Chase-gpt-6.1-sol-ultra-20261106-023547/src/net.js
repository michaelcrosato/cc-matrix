/* AI Hub v1 adapter. Transport ids are never accepted from a client payload. */
(function (root) {
	"use strict";
	const net = {
		active: !!root.AIHub?.active,
		authority: false,
		ended: false,
		started: false,
		localId: null,
		state: null,
		info: null,
		stats: {
			sent: 0,
			received: 0,
			stale: 0,
			rejected: 0,
			actions: 0,
			maxBytes: 0,
		},
		pendingActions: new Map(),
		acknowledgements: new Map(),
	};
	let callbacks = {},
		api,
		initialized = false,
		finished = false;
	let seq = 0,
		snapSeq = 0,
		latestSnap = -1,
		commandTimer = 0,
		snapshotTimer = 0;
	let actionNumber = 0,
		plantHeld = false,
		simulationAccumulator = 0,
		transitionTimer = 0;
	let localCommand = { dir: null, plant: false },
		pendingDirection = null;
	let transportToActor = new Map(),
		actorsToTransport = new Map();
	let remote = new Map(),
		lastCommands = new Map(),
		actionQueue = [],
		actionResults = new Map();
	let eventQueue = [],
		eventSeq = 0,
		seenEvent = 0,
		visualCache = null;
	const now = () =>
		typeof performance !== "undefined" ? performance.now() : Date.now();
	const copy = (value) => JSON.parse(JSON.stringify(value));
	const cleanDirection = (v) => {
		if (!Array.isArray(v) || v.length !== 2) return null;
		const x = Number(v[0]),
			y = Number(v[1]);
		return Number.isFinite(x) &&
			Number.isFinite(y) &&
			Math.abs(x) + Math.abs(y) === 1 &&
			Number.isInteger(x) &&
			Number.isInteger(y)
			? [x, y]
			: null;
	};
	const cleanCell = (v) =>
		Array.isArray(v) &&
		v.length === 2 &&
		v.every((n) => Number.isInteger(n) && n >= 0 && n <= 31)
			? v.slice()
			: undefined;
	function send(data, options) {
		if (!net.active || net.ended) return false;
		const bytes = JSON.stringify(data).length;
		net.stats.maxBytes = Math.max(net.stats.maxBytes, bytes);
		if (bytes >= 16384) {
			net.stats.rejected++;
			return false;
		}
		const ok = api.send(data, options);
		if (ok !== false) net.stats.sent++;
		return ok !== false;
	}
	// Histories/checkpoints are authority-only. Visual body samples are retained.
	function wireState() {
		return JSON.parse(
			JSON.stringify(net.state, (key, value) => {
				if (
					key === "level" ||
					key === "events" ||
					key === "checkpoint" ||
					key === "entryCheckpoint" ||
					key === "entry" ||
					key === "history" ||
					key === "_history" ||
					key === "trail" ||
					key === "pathHistory" ||
					key === "recent" ||
					key === "actions" ||
					key === "_graph" ||
					key === "graph"
				)
					return undefined;
				if (typeof value === "number" && Number.isFinite(value))
					return Math.round(value * 1000) / 1000;
				return value;
			}),
		);
	}
	function snapshot(reliable = false) {
		if (!net.authority || !net.state || net.ended) return;
		const packet = {
			t: "s",
			r: api.round,
			g: net.state.garden,
			q: ++snapSeq,
			s: wireState(),
			e: eventQueue.slice(-24),
			a: Array.from(actionResults.entries()).slice(-16),
		};
		send(packet, { reliable });
	}
	function announce() {
		callbacks.onState?.(net.state);
	}
	function namePlayers() {
		for (const p of net.state.players)
			p.name =
				api.players.find((a) => transportToActor.get(a.id) === p.id)?.name ||
				"";
	}
	function finish() {
		if (!net.authority || finished || net.ended || !net.state) return;
		finished = true;
		snapshot(true);
		const ids = api.players.map((p) => p.id);
		const score = Number(net.state.score) || 0;
		const stats = Object.fromEntries(
			ids.map((id) => [
				id,
				{
					Gardens: Math.min(
						5,
						net.state.garden + (net.state.status === "victory" ? 1 : 0),
					),
					Bites: net.state.stats?.bites || net.state.bites || 0,
				},
			]),
		);
		api.finish({
			standings: ids.length ? [ids] : [],
			scores: Object.fromEntries(ids.map((id) => [id, score])),
			won: net.state.status === "victory",
			stats,
		});
		callbacks.onFinish?.(net.state);
	}
	function validRound(data) {
		return data && data.r === api.round && data.g === net.state?.garden;
	}
	function ack(from, key, value) {
		actionResults.set(key, value);
		send(
			{ t: "a", r: api.round, id: key, result: value },
			{ to: from, reliable: true },
		);
	}
	function message(data, from) {
		if (!net.active || net.ended || !data || typeof data !== "object") return;
		net.stats.received++;
		if (net.authority) {
			const actor = transportToActor.get(from);
			if (!actor || !api.players.some((p) => p.id === from)) {
				net.stats.rejected++;
				return;
			}
			if (data.t === "c") {
				if (
					!validRound(data) ||
					!Number.isSafeInteger(data.q) ||
					data.q <= (lastCommands.get(from) ?? -1)
				) {
					net.stats.stale++;
					return;
				}
				lastCommands.set(from, data.q);
				remote.set(actor, {
					dir: cleanDirection(data.d),
					target: cleanCell(data.tg),
					at: now(),
				});
			} else if (data.t === "p") {
				const key = `${from}:${String(data.id).slice(0, 64)}`;
				if (actionResults.has(key)) {
					ack(from, key, actionResults.get(key));
					return;
				}
				if (actionQueue.some((a) => a.key === key)) return;
				if (
					!validRound(data) ||
					typeof data.id !== "string" ||
					!/^\d+-\d+$/.test(data.id)
				) {
					ack(from, key, "rejected");
					return;
				}
				if (data.pt !== undefined && !cleanCell(data.pt)) {
					ack(from, key, "rejected");
					return;
				}
				if (finished || net.state.status !== "playing") {
					ack(from, key, "rejected");
					return;
				}
				const recent = net.acknowledgements.get(from) || 0;
				if (now() - recent < 150) {
					ack(from, key, "rate-limited");
					return;
				}
				net.acknowledgements.set(from, now());
				actionQueue.push({
					actor,
					from,
					key,
					garden: data.g,
					plantTarget: cleanCell(data.pt),
				});
			}
			return;
		}
		if (from !== api.host) {
			net.stats.rejected++;
			return;
		}
		if (data.t === "a" && data.r === api.round && typeof data.id === "string") {
			net.pendingActions.delete(data.id);
			net.acknowledgements.set(data.id, data.result);
		} else if (data.t === "s") {
			if (
				data.r !== api.round ||
				!Number.isSafeInteger(data.q) ||
				data.q <= latestSnap ||
				!data.s ||
				typeof data.s !== "object"
			) {
				net.stats.stale++;
				return;
			}
			if (data.g < (net.state?.garden || 0)) {
				net.stats.stale++;
				return;
			}
			latestSnap = data.q;
			const state = data.s;
			state.level = root.GardenSim.levels[state.garden];
			state.events = [];
			for (const [n, e] of data.e || [])
				if (n > seenEvent) {
					state.events.push(e);
					seenEvent = Math.max(seenEvent, n);
				}
			for (const [id, result] of data.a || []) {
				net.pendingActions.delete(id);
				net.acknowledgements.set(id, result);
			}
			if (
				net.state?.garden !== state.garden ||
				net.state?.status !== state.status
			)
				pendingDirection = null;
			net.state = state;
			announce();
		}
	}
	function leave({ id }) {
		const actor = transportToActor.get(id);
		remote.delete(actor);
		lastCommands.delete(id);
		actionQueue = actionQueue.filter((a) => a.actor !== actor);
		if (net.authority && net.state && actor) {
			if (root.GardenSim.removePlayer)
				root.GardenSim.removePlayer(net.state, actor);
			else {
				net.state.players = net.state.players.filter((p) => p.id !== actor);
				net.state.bait = (net.state.bait || []).filter(
					(b) => b.owner !== actor && b.player !== actor,
				);
			}
			net.state.playerCount = net.state.players.length;
			snapshot(true);
			announce();
		}
		transportToActor.delete(id);
		actorsToTransport.delete(actor);
		callbacks.onLeave?.(id);
	}
	net.init = async function init(handlers = {}) {
		if (initialized) return net.info;
		initialized = true;
		callbacks = handlers;
		api = root.AIHub;
		if (!api) {
			net.active = false;
			return null;
		}
		api.on("start", () => {
			if (!net.ended) {
				net.started = true;
				callbacks.onStart?.();
			}
		});
		api.on("message", message);
		api.on("leave", leave);
		api.on("time-up", () => {
			if (net.authority && !net.ended) finish();
		});
		api.on("end", (data) => {
			net.ended = true;
			net.started = false;
			localCommand = { dir: null, plant: false };
			pendingDirection = null;
			remote.clear();
			actionQueue = [];
			net.pendingActions.clear();
			simulationAccumulator = 0;
			if (net.state) net.state.events = [];
			callbacks.onEnd?.(data);
		});
		const info = await api.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			net.active = false;
			return null;
		}
		net.info = info;
		net.active = true;
		net.authority = !!api.isHost;
		api.players.forEach((p, i) => {
			transportToActor.set(p.id, i + 1);
			actorsToTransport.set(i + 1, p.id);
		});
		net.localId = api.server ? null : (transportToActor.get(api.me) ?? null);
		net.state = root.GardenSim.create({
			garden: 0,
			players: Math.max(1, api.players.length),
			seed: api.seed || 1,
		});
		namePlayers();
		callbacks.onSession?.(info);
		announce();
		if (net.authority) snapshot(true);
		api.ready();
		return info;
	};
	net.update = function update(dt, command) {
		if (!net.active || net.ended || finished || !net.state) return;
		const input = command || callbacks.getCommand?.() || {};
		localCommand = {
			dir: cleanDirection(input.dir),
			target: cleanCell(input.target),
			plantTarget: cleanCell(input.plantTarget),
			plant: false,
		};
		// A press is a discrete action, even if a held button appears in many heartbeats.
		const pressed = !!input.plant && !plantHeld;
		plantHeld = !!input.plant;
		if (!net.started || api.time() < 0) return;
		const elapsed = Math.max(0, Math.min(Number(dt) || 0, 0.25));
		if (!net.authority) {
			// Preserve short buffered turns until one permitted heartbeat sends them.
			// A later pointer destination supersedes an unsent direction.
			if (localCommand.dir) pendingDirection = localCommand.dir;
			else if (localCommand.target) pendingDirection = null;
			commandTimer += elapsed;
			if (commandTimer >= 0.125 && net.localId !== null) {
				commandTimer %= 0.125;
				const direction = pendingDirection || localCommand.dir;
				const sent = send(
					{
						t: "c",
						r: api.round,
						g: net.state.garden,
						q: ++seq,
						d: direction,
						tg: direction ? undefined : localCommand.target,
					},
					{ to: api.host, reliable: !!pendingDirection },
				);
				if (sent) pendingDirection = null;
			}
			if (pressed && net.localId !== null) {
				const id = `${net.state.garden}-${++actionNumber}`,
					key = `${api.me}:${id}`;
				const data = {
					t: "p",
					r: api.round,
					g: net.state.garden,
					id,
					pt: localCommand.plantTarget,
				};
				net.pendingActions.set(key, { data, at: now() });
				send(data, { to: api.host, reliable: true });
			}
			for (const pending of net.pendingActions.values())
				if (now() - pending.at > 650) {
					pending.at = now();
					send(pending.data, { to: api.host, reliable: true });
				}
			return;
		}
		if (pressed && net.localId !== null)
			actionQueue.push({
				actor: net.localId,
				from: api.me,
				key: `${api.me}:local-${++actionNumber}`,
				garden: net.state.garden,
				local: true,
				plantTarget: localCommand.plantTarget,
			});
		simulationAccumulator += elapsed;
		while (simulationAccumulator >= 1 / 60 && !finished && !net.ended) {
			simulationAccumulator -= 1 / 60;
			const commands = {};
			for (const p of net.state.players) {
				const c = p.id === net.localId ? localCommand : remote.get(p.id);
				commands[p.id] = {
					dir: c && (p.id === net.localId || now() - c.at < 700) ? c.dir : null,
					plant: false,
					target: c?.target,
					stop: p.id !== net.localId && (!c || now() - c.at >= 700),
				};
			}
			const actions = [],
				usedActors = new Set(),
				deferred = [];
			for (const action of actionQueue) {
				if (usedActors.has(action.actor)) deferred.push(action);
				else {
					usedActors.add(action.actor);
					actions.push(action);
				}
			}
			actionQueue = deferred;
			for (const a of actions)
				if (a.garden === net.state.garden && commands[a.actor]) {
					commands[a.actor].plant = true;
					commands[a.actor].actionId = a.key;
					commands[a.actor].plantTarget = a.plantTarget;
				}
			const seeds = net.state.seeds;
			const beforeBait = copy(net.state.bait || []);
			if (net.state.status === "playing")
				root.GardenSim.step(net.state, commands, 1 / 60);
			else net.state.events = [];
			for (const a of actions) {
				let accepted =
					a.garden === net.state.garden &&
					(net.state.bait || []).some(
						(b) =>
							(b.owner === a.actor || b.player === a.actor) &&
							!beforeBait.some(
								(old) =>
									old.x === b.x &&
									old.y === b.y &&
									(old.owner === a.actor || old.player === a.actor),
							),
					);
				if (actions.length === 1 && net.state.seeds < seeds) accepted = true;
				const resolved = (net.state.plantResults || []).find(
					(result) => result.actionId === a.key,
				);
				if (resolved) accepted = resolved.accepted;
				if (!a.local) ack(a.from, a.key, accepted ? "accepted" : "rejected");
				net.stats.actions++;
			}
			for (const e of net.state.events || [])
				eventQueue.push([++eventSeq, copy(e)]);
			eventQueue = eventQueue.slice(-24);
			if (net.state.status === "clear") {
				transitionTimer += 1 / 60;
				if (transitionTimer >= 2.5) {
					transitionTimer = 0;
					remote.clear();
					actionQueue = [];
					const previous = net.state;
					const next = root.GardenSim.next(net.state);
					if (next && typeof next === "object") net.state = next;
					namePlayers();
					if (
						net.state === previous &&
						net.state.status === "clear" &&
						net.state.garden >= 4
					)
						net.state.status = "victory";
					snapshot(true);
				}
			} else transitionTimer = 0;
			if (net.state.status === "victory" || net.state.status === "defeat")
				finish();
			announce();
		}
		snapshotTimer += elapsed;
		if (snapshotTimer >= 0.12) {
			snapshotTimer %= 0.12;
			snapshot(false);
		}
	};
	// Presentation smoothing never writes back to the authoritative snapshot.
	// A wrap, respawn, new garden or result is a discontinuity, not a long lerp.
	net.visual = function visual(dt = 1 / 60) {
		const source = net.state;
		if (!source || net.authority) return source;
		if (
			!visualCache ||
			visualCache.garden !== source.garden ||
			visualCache.status !== source.status
		) {
			visualCache = copy(source);
			return visualCache;
		}
		const alpha =
			1 - Math.exp(-Math.max(0, Math.min(Number(dt) || 0, 0.25)) * 25);
		const smooth = (target, previous) => {
			const out = { ...target };
			if (
				previous &&
				Number.isFinite(target.x) &&
				Number.isFinite(target.y) &&
				Math.hypot(target.x - previous.x, target.y - previous.y) <= 1.5
			) {
				out.x = previous.x + (target.x - previous.x) * alpha;
				out.y = previous.y + (target.y - previous.y) * alpha;
			}
			return out;
		};
		const actors = (list, old) =>
			list.map((actor) =>
				smooth(
					actor,
					old.find((p) => p.id === actor.id),
				),
			);
		const next = {
			...source,
			players: actors(source.players, visualCache.players),
			sentries: actors(source.sentries, visualCache.sentries),
		};
		next.crawlers = source.crawlers.map((crawler) => {
			const old = visualCache.crawlers.find((c) => c.id === crawler.id),
				out = smooth(crawler, old);
			out.body = crawler.body.map((body, i) => smooth(body, old?.body?.[i]));
			out.tail = out.body.length ? out.body[out.body.length - 1] : null;
			return out;
		});
		visualCache = next;
		return next;
	};
	net.inspect = () => ({
		active: net.active,
		authority: net.authority,
		ended: net.ended,
		started: net.started,
		localId: net.localId,
		pending: net.pendingActions.size,
		stats: copy(net.stats),
		state: net.state
			? {
					tick: net.state.tick,
					garden: net.state.garden,
					status: net.state.status,
					score: net.state.score,
					lives: net.state.lives,
					seeds: net.state.seeds,
					tails: net.state.crawlers.map((c) => c.segments),
					players: net.state.players.map((p) => p.id),
				}
			: null,
	});
	root.GardenNet = net;
	if (typeof module !== "undefined") module.exports = net;
})(typeof window !== "undefined" ? window : globalThis);
