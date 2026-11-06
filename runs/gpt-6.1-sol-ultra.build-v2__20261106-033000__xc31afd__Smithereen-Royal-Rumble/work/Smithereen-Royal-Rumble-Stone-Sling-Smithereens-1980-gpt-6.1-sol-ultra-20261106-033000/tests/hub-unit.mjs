import { createOnlineAdapter } from "../src/online.js";
import { createWorld, predict } from "../src/sim.js";
import { pathToFileURL } from "node:url";

export function runHubUnit() {
	let checks = 0;
	const failures = [];
	const evidence = [];
	const check = (ok, label) => {
		checks++;
		if (!ok) failures.push(`Hub unit: ${label}`);
	};

	function session({
		server = false,
		delay = 0,
		jitter = 0,
		loss = 0,
		reject = 0,
	} = {}) {
		let now = -1;
		let netSeq = 0;
		let rejected = reject;
		const queue = [];
		const copies = [];
		const players = [
			{ id: 0, name: "<Red & Fox>" },
			{ id: 1, name: "Blue Otter" },
		];
		const host = server ? 2 : 0;
		const copyIds = server ? [0, 1, 2] : [0, 1];
		const finishes = [];
		function deliver(to, event, ...args) {
			for (const fn of copies.find((c) => c.id === to)?.handlers.get(event) ||
				[])
				fn(...args);
		}
		for (const id of copyIds) {
			const handlers = new Map();
			const app = {
				world: null,
				screen: "title",
				audio: {
					stopped: 0,
					stop() {
						this.stopped++;
					},
				},
				input: {
					cleared: 0,
					clear() {
						this.cleared++;
					},
				},
			};
			const hub = {
				time: () => now * 1000,
				on(type, fn) {
					const list = handlers.get(type) || [];
					list.push(fn);
					handlers.set(type, list);
					return () => list.splice(list.indexOf(fn), 1);
				},
				send(data, opts = {}) {
					if (rejected > 0) {
						rejected--;
						return false;
					}
					const targets =
						opts.to === undefined ? copyIds.filter((v) => v !== id) : [opts.to];
					for (const target of targets) {
						const n = ++netSeq;
						if (
							!opts.reliable &&
							loss &&
							n % Math.max(1, Math.round(1 / loss)) === 0
						)
							continue;
						const lag = Math.max(
							0,
							delay + (jitter ? ((n % 3) - 1) * jitter : 0),
						);
						queue.push({
							when: now + lag,
							target,
							data: structuredClone(data),
							from: id,
						});
					}
					return true;
				},
				finish(value) {
					finishes.push({ id, value });
					for (const other of copyIds)
						deliver(other, "end", {
							reason: "finished",
							standings: value.standings,
						});
				},
			};
			copies.push({ id, app, hub, handlers, adapter: null });
		}
		copies.forEach((c) => {
			c.adapter = createOnlineAdapter(c.app, c.hub, {
				me: c.id,
				isHost: c.id === host,
				host,
				server: c.id === 2,
				players,
				seed: 912,
				limitMs: 180000,
			});
			c.app.online = c.adapter;
		});
		function advance(seconds) {
			const end = now + seconds;
			while (now < end - 1e-7) {
				now = Math.min(end, now + 1 / 120);
				// Reverse ready messages emulates reordering for unreliable snapshots; reliable order remains protected by lag.
				queue.sort((a, b) => a.when - b.when);
				while (queue.length && queue[0].when <= now + 1e-8) {
					const m = queue.shift();
					deliver(m.target, "message", m.data, m.from);
				}
				copies.forEach((c) => c.adapter.update(1 / 120));
			}
		}
		return {
			copies,
			host,
			queue,
			finishes,
			deliver,
			get now() {
				return now;
			},
			start() {
				copyIds.forEach((id) => deliver(id, "start", { in: 1000 }));
			},
			advance,
			hostCopy: () => copies.find((c) => c.id === host),
		};
	}

	const ordinary = session();
	ordinary.start();
	ordinary.advance(0.9);
	check(
		ordinary.hostCopy().app.world.tick === 0,
		"negative scheduled Hub time never advances combat",
	);
	ordinary.advance(0.2);
	check(
		ordinary.hostCopy().app.world.tick > 0,
		"host starts from synchronized round time",
	);
	check(
		ordinary.copies[1].adapter.diagnostics().baselineVersion > 0,
		"passive client receives reliable baseline",
	);
	check(
		ordinary.hostCopy().adapter.diagnostics().baselineAcks > 0,
		"passive client acknowledges without Fire",
	);
	check(
		ordinary.copies[1].app.hubSeat === 1,
		"Hub seat derives from authenticated player ordering",
	);
	check(
		ordinary.copies[0].app.hubNames[0] === "<Red & Fox>",
		"Hub names preserved as plain text values",
	);
	ordinary.copies[1].adapter.command(0, { type: "begin" });
	ordinary.advance(0.8);
	ordinary.copies[1].adapter.command(0, { type: "release" });
	ordinary.advance(0.2);
	check(
		ordinary.hostCopy().app.world.stats.shots[1] === 1,
		"remote Fire controls authenticated seat, ignoring claimed seat",
	);
	check(
		ordinary.hostCopy().app.world.stats.shots[0] === 0,
		"remote player cannot launch for host seat",
	);
	ordinary.copies[0].adapter.command(0, { type: "begin" });
	ordinary.advance(0.9);
	ordinary.copies[0].adapter.command(0, { type: "release" });
	ordinary.advance(0.1);
	check(
		ordinary.hostCopy().app.world.stats.shots[0] === 1,
		"host local player uses same validated command adapter",
	);
	const before = ordinary.hostCopy().app.world.stats.shots[1];
	ordinary.deliver(
		ordinary.host,
		"message",
		{
			t: "c",
			v: 1,
			n: 1,
			at: ordinary.now,
			c: { type: "release", duration: 1 },
		},
		1,
	);
	check(
		ordinary.hostCopy().app.world.stats.shots[1] === before,
		"duplicate/stale remote sequence cannot launch twice",
	);
	check(
		ordinary.hostCopy().adapter.diagnostics().duplicateCommands === 1,
		"duplicate is explicitly counted",
	);
	ordinary.advance(4);
	const h = ordinary.hostCopy().app.world;
	const c = ordinary.copies[1].app.world;
	check(
		h.blocks.map((b) => b.alive).join() === c.blocks.map((b) => b.alive).join(),
		"remote block silhouette agrees with authoritative world",
	);
	check(
		ordinary.hostCopy().adapter.diagnostics().maxSnapshotBytes <= 1200,
		"snapshot remains within 1200-byte unreliable packet target",
	);
	check(
		ordinary.hostCopy().adapter.diagnostics().maxOneSecond <= 40,
		"aggregate host traffic stays within 40-message burst",
	);
	check(
		ordinary.copies.every((c) => c.adapter.diagnostics().maxBytes < 16384),
		"all messages stay within 16KB protocol ceiling",
	);
	ordinary.deliver(ordinary.host, "time-up", { graceMs: 5000 });
	ordinary.advance(0.8);
	check(ordinary.finishes.length === 1, "time-up reports exactly one finish");
	check(
		ordinary.finishes[0]?.value.standings.flat().sort().join() === "0,1",
		"finish standings list both players exactly once",
	);
	const sentAfterEnd = ordinary.copies.map((c) => c.adapter.diagnostics().sent);
	ordinary.copies.forEach((c) => c.adapter.command(c.id, { type: "begin" }));
	ordinary.advance(1);
	check(
		ordinary.copies.every(
			(c, i) => c.adapter.diagnostics().sent === sentAfterEnd[i],
		),
		"end stops all outgoing game messages",
	);
	check(
		ordinary.copies.every(
			(c) => c.app.audio.stopped > 0 && c.app.input.cleared > 0,
		),
		"end stops audio and clears input on every copy",
	);
	evidence.push({
		name: "normal",
		host: ordinary.hostCopy().adapter.diagnostics(),
	});

	const adverse = session({ delay: 0.15, jitter: 0.05, loss: 0.05, reject: 3 });
	adverse.start();
	adverse.advance(1.6);
	check(
		adverse.copies[0].adapter.diagnostics().retries > 0,
		"locally rejected reliable packets retry successfully",
	);
	const remote = adverse.copies[1];
	remote.adapter.command(1, { type: "begin" });
	adverse.advance(0.83);
	remote.adapter.command(1, { type: "release" });
	adverse.advance(0.5);
	const launch = adverse
		.hostCopy()
		.app.world.events.find((e) => e.type === "launch" && e.seat === 1);
	check(
		!!launch,
		"remote charge launches under 150ms latency, 50ms jitter and 5% unreliable loss",
	);
	check(
		Math.abs((launch?.power || 0) - 0.83 / 1.4) < 0.035,
		"measured hold preserves range under asymmetric transport delays",
	);
	adverse.advance(4.5);
	check(
		adverse
			.hostCopy()
			.app.world.blocks.map((b) => b.alive)
			.join() === remote.app.world.blocks.map((b) => b.alive).join(),
		"later complete snapshots repair lost/reordered block updates",
	);
	adverse.deliver(
		adverse.host,
		"message",
		{
			t: "c",
			v: 1,
			n: 999,
			at: adverse.now,
			c: { type: "release", duration: 5000 },
		},
		1,
	);
	check(
		adverse.hostCopy().adapter.diagnostics().blockedCommands > 0,
		"unmatched/unbounded reported hold rejected",
	);
	const forgedBefore = adverse
		.hostCopy()
		.app.world.players.map((p) => p.score)
		.join();
	adverse.deliver(
		adverse.host,
		"message",
		{ t: "s", v: 1, n: 999, b: "", p: [], o: { winner: 1 } },
		1,
	);
	check(
		adverse
			.hostCopy()
			.app.world.players.map((p) => p.score)
			.join() === forgedBefore,
		"client cannot submit host state/damage/score",
	);
	adverse.deliver(
		adverse.host,
		"message",
		{ t: "c", v: 1, n: 1000, at: adverse.now, c: { type: "begin" } },
		1,
	);
	check(
		!!adverse.hostCopy().app.world.players[1].charge,
		"fresh authenticated begin accepted after previous remote shot",
	);
	adverse.deliver(
		adverse.host,
		"message",
		{ t: "c", v: 1, n: 1001, at: adverse.now - 5, c: { type: "cancel" } },
		1,
	);
	check(
		adverse.hostCopy().app.world.players[1].charge === null,
		"a delayed safe cancel cannot leave host charge latched",
	);
	evidence.push({
		name: "adverse",
		host: adverse.hostCopy().adapter.diagnostics(),
		launchPower: launch?.power,
	});

	const server = session({ server: true });
	server.start();
	server.advance(1.4);
	check(
		server.hostCopy().adapter.seat === null,
		"dedicated host has no local player",
	);
	check(
		server.hostCopy().app.world.tick > 0,
		"dedicated host advances world without local seat",
	);
	check(
		server.copies
			.filter((c) => c.id < 2)
			.every((c) => c.adapter.diagnostics().appliedSeq > 0),
		"both players receive dedicated authoritative state",
	);
	server.copies[0].adapter.command(1, { type: "begin" });
	server.advance(0.8);
	server.copies[0].adapter.command(1, { type: "release" });
	server.advance(0.2);
	check(
		server.hostCopy().app.world.stats.shots[0] === 1,
		"server authenticates first remote player intent",
	);
	server.deliver(server.host, "time-up", { graceMs: 5000 });
	server.advance(0.8);
	check(
		server.finishes.length === 1 && server.finishes[0].id === 2,
		"server host alone reports valid time-up outcome",
	);
	evidence.push({
		name: "server",
		host: server.hostCopy().adapter.diagnostics(),
	});

	const recovery = session();
	recovery.start();
	recovery.advance(1.5);
	const recoveryHost = recovery.hostCopy();
	const crewShot = Array.from({ length: 165 }, (_, i) => 0.18 + i * 0.005)
		.map((power) => ({
			power,
			hit: predict(recoveryHost.app.world, 0, power, 0).impacts.find(
				(hit) => hit.target === "crew",
			),
		}))
		.find((s) => s.hit);
	check(
		!!crewShot,
		"production prediction supplies reachable crew interruption for network recovery scenario",
	);
	recoveryHost.adapter.command(0, { type: "begin" });
	recovery.advance(crewShot.power * 1.4);
	recoveryHost.adapter.command(0, { type: "release" });
	recovery.advance(0.02);
	const interrupted = recovery.copies[1];
	interrupted.adapter.command(1, { type: "begin" });
	recovery.advance(crewShot.hit.time + 0.2);
	check(
		recoveryHost.app.world.stats.crew === 1 &&
			recoveryHost.app.world.players[1].charge === null,
		"real production crew hit cancels network player charge",
	);
	interrupted.adapter.command(1, { type: "release" });
	recovery.advance(2.2);
	interrupted.adapter.command(1, { type: "begin" });
	recovery.advance(0.1);
	check(
		!!recoveryHost.app.world.players[1].charge,
		"fresh network begin succeeds after interrupted charge recovers",
	);
	recovery.advance(0.8);
	interrupted.adapter.command(1, { type: "release" });
	recovery.advance(0.1);
	check(
		recoveryHost.app.world.stats.shots[1] === 1,
		"network player fires normally after interruption without requiring menu cancel",
	);

	const departure = session();
	departure.start();
	departure.advance(1.5);
	departure.deliver(0, "leave", { id: 1, reason: "disconnected" });
	departure.advance(0.3);
	check(
		departure.finishes.length === 1 &&
			departure.hostCopy().app.world.outcome?.winner === 0,
		"player departure ends match with host-owned forfeit",
	);
	const hostDeparture = session();
	hostDeparture.start();
	hostDeparture.advance(1.4);
	hostDeparture.deliver(1, "end", { reason: "host-left" });
	hostDeparture.advance(1);
	check(
		hostDeparture.copies[1].app.hubEnded &&
			hostDeparture.copies[1].app.hubEndReason === "host-left",
		"host departure stops client without invented migration",
	);
	check(
		hostDeparture.finishes.length === 0,
		"client never claims host finish after host departure",
	);
	return { checks, failures, evidence };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
	const result = runHubUnit();
	result.failures.forEach((failure) => console.error(failure));
	console.log(`${result.checks} checks, ${result.failures.length} failures`);
	process.exitCode = result.failures.length ? 1 : 0;
}
