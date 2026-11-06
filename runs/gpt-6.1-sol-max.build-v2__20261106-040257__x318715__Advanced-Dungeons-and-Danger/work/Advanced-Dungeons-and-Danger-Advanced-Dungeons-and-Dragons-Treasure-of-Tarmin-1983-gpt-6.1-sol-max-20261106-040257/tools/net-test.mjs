import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { Model } from "../src/core/model.js";
import {
	Network,
	encodeInvite,
	decodeInvite,
	diffState,
	applyDelta,
	validSnapshot,
} from "../src/net/network.js";

/** Pure protocol checks. The separate browser suite verifies actual WebRTC and the official Hub harness. */
export async function runNetworkTests() {
	const failures = [];
	let passed = 0;
	const test = async (name, body) => {
		try {
			await body();
			passed++;
		} catch (error) {
			failures.push(`${name}: ${error.message}`);
		}
	};
	const sdp =
		"v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\na=ice-ufrag:test\r\na=ice-pwd:abcdefghijklmnopqrstuvwxyz\r\na=candidate:1 1 udp 1 127.0.0.1 45000 typ host\r\n";
	const description = { type: "offer", sdp };
	const run = "test-network-v1";

	await test("complete invite round-trip retains gathered candidates", () => {
		const value = decodeInvite(encodeInvite(description, run), "offer");
		assert.equal(value.sdp, sdp);
		assert.equal(value.run, run);
		assert.equal(value.type, "offer");
	});
	await test("invite ignores copy/paste whitespace", () => {
		const code = encodeInvite(description, run);
		assert.equal(
			decodeInvite(`\n ${code.slice(0, 60)}\n${code.slice(60)} \n`, "offer")
				.run,
			run,
		);
	});
	await test("wrong-role, truncated, oversized and malformed invites rejected", () => {
		const code = encodeInvite(description, run);
		assert.throws(() => decodeInvite(code, "answer"), /needs the answer/);
		assert.throws(() => decodeInvite(code.slice(0, -20), "offer"));
		assert.throws(() => decodeInvite("DD1.O." + "A".repeat(120_001), "offer"));
		assert.throws(() => decodeInvite("DD9.O." + code.slice(6), "offer"));
	});
	await test("answer from another expedition cannot change the host peer", async () => {
		const net = new Network();
		let imported = false;
		net.mode = "rtc-host";
		net.ended = false;
		net._run = run;
		net.pc = {
			signalingState: "have-local-offer",
			setRemoteDescription: async () => {
				imported = true;
			},
		};
		await assert.rejects(
			net.accept(encodeInvite({ type: "answer", sdp }, "another-expedition")),
			/another invitation/,
		);
		assert.equal(imported, false);
		net.pc = null;
		net.close();
	});

	const rawInvite = (data, type = data.type) =>
		`DD1.${type === "offer" ? "O" : "A"}.${Buffer.from(JSON.stringify(data)).toString("base64url")}`;
	await test("planning rules preserve stock eight seconds and both bounds", () => {
		assert.equal(
			decodeInvite(encodeInvite(description, run), "offer").rules
				.planningSeconds,
			8,
		);
		for (const planningSeconds of [2, 8, 30]) {
			const rules = { planningSeconds };
			assert.deepEqual(
				decodeInvite(encodeInvite(description, run, rules), "offer").rules,
				rules,
			);
			assert.deepEqual(
				decodeInvite(
					encodeInvite({ type: "answer", sdp }, run, rules),
					"answer",
				).rules,
				rules,
			);
		}
	});
	await test("legacy invites without rules retain stock-eight compatibility", async () => {
		const offer = decodeInvite(encodeInvite(description, run), "offer");
		delete offer.rules;
		assert.deepEqual(decodeInvite(rawInvite(offer), "offer").rules, {
			planningSeconds: 8,
		});
		const net = new Network();
		let imports = 0;
		net.mode = "rtc-host";
		net.ended = false;
		net._run = run;
		net.pc = {
			signalingState: "have-local-offer",
			setRemoteDescription: async () => {
				imports++;
			},
		};
		await net.accept(rawInvite({ ...offer, type: "answer" }));
		assert.equal(imports, 1);
		net.pc = null;
		net.close();
	});
	await test("malformed or out-of-range planning rules are rejected", () => {
		for (const planningSeconds of [1, 31, 8.5, "8", null, NaN, Infinity]) {
			assert.throws(
				() => encodeInvite(description, run, { planningSeconds }),
				/integer from 2 to 30/,
			);
			const data = {
				v: 1,
				game: "ddanger",
				run,
				type: "offer",
				sdp,
				rules: { planningSeconds },
			};
			assert.throws(
				() => decodeInvite(rawInvite(data), "offer"),
				/integer from 2 to 30/,
			);
		}
		for (const rules of [null, [], {}, { planningSeconds: 8, damage: 99 }]) {
			assert.throws(() =>
				decodeInvite(
					rawInvite({ v: 1, game: "ddanger", run, type: "offer", sdp, rules }),
					"offer",
				),
			);
		}
	});
	await test("wrong planning answer leaves host SDP untouched", async () => {
		const net = new Network();
		let imports = 0;
		net.mode = "rtc-host";
		net.ended = false;
		net._run = run;
		net.rules = Object.freeze({ planningSeconds: 12 });
		net.pc = {
			signalingState: "have-local-offer",
			setRemoteDescription: async () => {
				imports++;
			},
		};
		await assert.rejects(
			net.accept(
				encodeInvite({ type: "answer", sdp }, run, { planningSeconds: 30 }),
			),
			/different planning window/,
		);
		await assert.rejects(
			net.accept(encodeInvite({ type: "answer", sdp }, run)),
			/different planning window/,
		);
		assert.equal(imports, 0);
		assert.equal(net.planningSeconds, 12);
		await net.accept(
			encodeInvite({ type: "answer", sdp }, run, { planningSeconds: 12 }),
		);
		assert.equal(imports, 1);
		net.pc = null;
		net.close();
	});
	await test("invalid host timing cannot close an existing expedition", async () => {
		const net = authority();
		const model = net.model;
		await assert.rejects(
			net.host({ planningSeconds: 0 }),
			/integer from 2 to 30/,
		);
		assert.equal(net.model, model);
		assert.equal(net.running, true);
		net.close();
	});
	await test("fresh custom RTC rules change the real deadline and mark the run", () => {
		for (const planningSeconds of [8, 12]) {
			const net = new Network();
			net.mode = "rtc-host";
			net.ended = false;
			net.isHost = true;
			net._handshaken = true;
			net._run = run;
			net.rules = Object.freeze({ planningSeconds });
			net._beginRtc();
			assert.equal(net.state.tuning.planningSeconds, planningSeconds);
			assert.equal(net.state.modified, planningSeconds !== 8);
			assert.equal(
				net.model.checkpoint.tuning.planningSeconds,
				planningSeconds,
			);
			assert.equal(net.model.checkpoint.modified, planningSeconds !== 8);
			if (planningSeconds === 8)
				assert.deepEqual(
					net.model.snapshot(),
					new Model({
						players: [
							{ id: "0", name: "Adventurer I" },
							{ id: "1", name: "Adventurer II" },
						],
						seed: 43021,
						runId: run,
					}).snapshot(),
				);
			net.model.dev({ type: "encounter", target: "upper.watchman" });
			net.model.command("0", { type: "guard" });
			assert.equal(net.state.combat.deadline, planningSeconds * 1000);
			net.model.advance(planningSeconds * 1000 - 1);
			assert.equal(net.state.combat.round, 1);
			net.model.advance(1);
			assert.equal(net.state.combat.round, 2);
			net.close();
		}
	});
	await test("DataChannel handshake rejects rules that differ from the codes", () => {
		const net = new Network();
		net.mode = "rtc-host";
		net.ended = false;
		net._run = run;
		net.rules = Object.freeze({ planningSeconds: 12 });
		net._receive(
			{
				v: 1,
				game: "ddanger",
				run,
				s: 1,
				kind: "hello",
				d: {
					protocol: 1,
					schema: 1,
					role: "guest",
					rules: { planningSeconds: 30 },
				},
			},
			"1",
		);
		assert.equal(net.ended, true);
		assert.equal(net.model, null);
		assert.match(net.status, /different planning window/);
		net.close();
	});
	await test("Hub initialization always uses canonical eight seconds", async () => {
		const previousHub = globalThis.AIHub;
		const net = new Network();
		try {
			globalThis.AIHub = {
				connect: async () => ({
					me: 0,
					host: 0,
					isHost: true,
					server: false,
					round: 1,
					seed: 777,
					players: [{ id: 0, name: "Hub player" }],
				}),
				on: () => () => {},
				time: () => -Infinity,
				ready: () => {},
				send: () => true,
			};
			net.rules = Object.freeze({ planningSeconds: 12 });
			assert.equal(await net.initHub(), true);
			assert.equal(net.planningSeconds, 8);
			assert.equal(net.state.tuning.planningSeconds, 8);
			assert.equal(net.state.modified, false);
		} finally {
			net.close();
			globalThis.AIHub = previousHub;
		}
	});

	await test("structural delta preserves arrays, object updates and deletions", () => {
		const before = {
			tick: 1,
			players: { 0: { x: 1, pack: ["a", null], old: true } },
			combat: null,
		};
		const after = {
			tick: 2,
			players: { 0: { x: 2, pack: [null, "a"] } },
			combat: { round: 1 },
		};
		assert.deepEqual(applyDelta(before, diffState(before, after)), after);
		assert.equal(before.players["0"].x, 1);
	});
	await test("delta rejects unsafe paths and missing bases", () => {
		assert.throws(() => applyDelta({}, [[["__proto__", "polluted"], true]]));
		assert.throws(() => applyDelta({}, [[["missing", "x"], 1]]));
		assert.equal({}.polluted, undefined);
	});

	function authority() {
		const net = new Network();
		net.mode = "rtc-host";
		net.localId = "0";
		net.isHost = true;
		net._run = run;
		net.running = true;
		net.ended = false;
		net._handshaken = true;
		net.model = new Model({
			players: [
				{ id: "0", name: "Host" },
				{ id: "1", name: "Guest" },
			],
			seed: 43021,
			runId: run,
		});
		net.state = net.model.state;
		return net;
	}
	function packet(net, action, seq = 1) {
		return {
			v: 1,
			game: "ddanger",
			run,
			s: seq,
			t: net.state.tick,
			floor: net.state.floor,
			round: net.state.combat?.round ?? 0,
			encounter: net.state.combat?.id ?? null,
			kind: "cmd",
			d: action,
		};
	}

	await test("production snapshot validates and illegal snapshot pools rejected", () => {
		const net = authority();
		assert.equal(validSnapshot(net.model.snapshot(), run), true);
		const bad = net.model.snapshot();
		bad.players["0"].war = -1;
		assert.equal(validSnapshot(bad, run), false);
		assert.equal(validSnapshot(net.model.snapshot(), "old-run"), false);
		net.close();
	});
	await test("transport identity owns the action even with a spoofed player field", () => {
		const net = authority();
		const hostDir = net.state.players["0"].dir;
		const guestDir = net.state.players["1"].dir;
		net._receive(packet(net, { type: "turn", delta: 1, player: "0" }), "1");
		assert.equal(net.state.players["0"].dir, hostDir);
		assert.equal(net.state.players["1"].dir, (guestDir + 1) % 4);
		net.close();
	});
	await test("duplicates and old-expedition commands cannot apply twice", () => {
		const net = authority();
		const dir = net.state.players["1"].dir;
		const p = packet(net, { type: "turn", delta: 1 });
		net._receive(p, "1");
		net._receive(p, "1");
		net._receive({ ...p, s: 2, run: "old-expedition" }, "1");
		assert.equal(net.state.players["1"].dir, (dir + 1) % 4);
		assert.equal(net.diagnostics().traffic.rejected, 2);
		net.close();
	});
	await test("stale encounter/floor and unknown sender rejected", () => {
		const net = authority();
		const before = net.model.snapshot();
		net._receive(
			{
				...packet(net, { type: "move", dx: 1, dy: 0 }),
				encounter: "old-encounter",
				round: 5,
			},
			"1",
		);
		net._receive(
			{ ...packet(net, { type: "turn", delta: 1 }, 2), floor: 2 },
			"1",
		);
		net._receive(packet(net, { type: "turn", delta: 1 }, 3), "uninvited");
		const after = net.model.snapshot();
		delete before.clock;
		delete after.clock;
		assert.deepEqual(after, before);
		assert.equal(
			net._outbox
				.filter((value) => value.kind === "ack")
				.every((value) => value.data.result.ok === false),
			true,
		);
		net.close();
	});
	await test("late intention cannot beat a throttled authority deadline", () => {
		const net = authority();
		net.model.dev({ type: "encounter", target: "upper.watchman" });
		net.model.command("0", { type: "guard" });
		const oldRound = net.state.combat.round;
		const late = packet(net, { type: "guard" });
		net._lastTick = performance.now() - 8100;
		net._receive(late, "1");
		assert.equal(net.state.stats.rounds, 1);
		assert.equal(net.state.combat.round, oldRound + 1);
		assert.equal(
			net._outbox.find((entry) => entry.kind === "ack").data.result.ok,
			false,
		);
		net.close();
	});

	await test("chunked snapshot and delta round-trip the production model", () => {
		const host = authority();
		const guest = new Network();
		guest.mode = "rtc-guest";
		guest.localId = "1";
		guest.isHost = false;
		guest._run = run;
		guest.ended = false;
		guest._handshaken = true;
		const sendQueued = () => {
			for (const entry of host._outbox.splice(0)) {
				const p = host._packet(entry.kind, entry.data);
				assert.ok(new TextEncoder().encode(JSON.stringify(p)).length < 15_200);
				guest._receive(p, "0");
			}
		};
		host._publish(true);
		sendQueued();
		assert.deepEqual(guest.state, host.model.snapshot());
		host.model.command("0", { type: "turn", delta: 1 });
		host._publish();
		sendQueued();
		assert.deepEqual(guest.state, host.model.snapshot());
		assert.ok(guest.diagnostics().traffic.snapshots >= 1);
		host.close();
		guest.close();
	});
	await test("guest departure recovers gear and leaves host alive", () => {
		const net = authority();
		net._connectionLost("Test departure.");
		assert.equal(net.mode, "solo");
		assert.equal(net.running, true);
		assert.equal(net.state.players["0"].connected, true);
		assert.equal(net.state.players["1"].connected, false);
		assert.ok(
			Object.values(net.state.entities).some(
				(entity) =>
					entity.type === "bag" ||
					entity.type === "loot" ||
					entity.type === "recovery",
			),
		);
		net.close();
	});
	await test("end stops authority and ignores subsequent commands", () => {
		const net = authority();
		net._end("Test end", false);
		const snapshot = net.model.snapshot();
		net._receive(packet(net, { type: "turn", delta: 1 }), "1");
		net.tick();
		assert.deepEqual(net.model.snapshot(), snapshot);
		assert.equal(net.send({ type: "turn", delta: 1 }).ok, false);
		assert.equal(net._outbox.length, 0);
		assert.equal(net._interval, null);
		net.close();
	});
	return {
		passed,
		failed: failures.length,
		total: passed + failures.length,
		failures,
	};
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const result = await runNetworkTests();
	for (const failure of result.failures) console.log(`FAIL ${failure}`);
	console.log(`${result.passed}/${result.total} network checks passed`);
	process.exitCode = result.failed ? 1 : 0;
}
