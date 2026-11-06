import {
	encodeInvite,
	decodeInvite,
	connectHub,
	createSoloController,
	createPeerLobby,
} from "../src/net.js";

export async function testNet() {
	const failures = [];
	let count = 0;
	const check = (name, value) => {
		count++;
		if (!value) failures.push(name);
	};
	const throws = (fn) => {
		try {
			fn();
			return false;
		} catch {
			return true;
		}
	};
	const sdp =
		"v=0\r\no=- 9876543 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=ice-ufrag:unit\r\n";
	const offer = encodeInvite({ type: "offer", sdp });
	check(
		"offer code round trip preserves ICE description",
		decodeInvite(offer, "offer").sdp === sdp,
	);
	check(
		"wrong-role code rejected",
		throws(() => decodeInvite(offer, "answer")),
	);
	check(
		"damaged code rejected",
		throws(() => decodeInvite("TARMIN1.broken", "offer")),
	);
	check(
		"truncated code rejected",
		throws(() => decodeInvite(offer.slice(0, -4), "offer")),
	);
	check(
		"oversized code rejected",
		throws(() => decodeInvite("X".repeat(160001), "offer")),
	);
	check(
		"unknown invite protocol rejected",
		throws(() => decodeInvite("TARMIN2." + offer.slice(8), "offer")),
	);
	let solo = createSoloController();
	check(
		"solo uses deterministic authority",
		solo.authority && solo.mode === "solo" && solo.state.players.solo,
	);
	solo.pause(true);
	check(
		"solo pause blocks commands",
		solo.send({ type: "turn", direction: 1 }).ok === false,
	);
	solo.close();
	check(
		"solo close blocks commands",
		solo.send({ type: "turn", direction: 1 }).ok === false,
	);
	const timed = createSoloController();
	timed.state.players.solo.sightUntil = timed.now + 20;
	await new Promise((resolve) => setTimeout(resolve, 80));
	check(
		"solo idle advances limited-duration wall sight without attrition",
		timed.state.clock > timed.state.players.solo.sightUntil &&
			timed.state.players.solo.war === 36 &&
			timed.state.players.solo.spirit === 24,
	);
	timed.pause(true);
	const pausedAt = timed.now;
	await new Promise((resolve) => setTimeout(resolve, 60));
	check(
		"solo pause stops the logical effect clock",
		Math.abs(timed.now - pausedAt) < 1,
	);
	timed.pause(false);
	const resumedAt = timed.now;
	check("solo resume excludes time spent paused", resumedAt - pausedAt < 5);
	const saved = structuredClone(timed.state);
	saved.clock = 1000000;
	timed.replaceState(saved);
	check(
		"loaded solo clock continues from saved simulation time",
		timed.now >= 1000000 && timed.now < 1000020,
	);
	timed.close();

	const oldHub = globalThis.AIHub;
	let session;
	try {
		let now = -Infinity;
		let ready = 0;
		let finish = [];
		const sent = [];
		const events = new Map();
		const ends = [];
		globalThis.AIHub = {
			active: true,
			connect: async (caps) => {
				check(
					"Hub negotiates shared world 1–2 seats",
					caps.mode === "shared-world" &&
						caps.seats[0] === 1 &&
						caps.seats[1] === 2,
				);
				return {
					isHost: true,
					server: true,
					me: 9,
					host: 9,
					seed: 84,
					round: 2,
					limitMs: 900000,
					players: [
						{ id: 0, name: "<safe>" },
						{ id: 1, name: "Ally" },
					],
				};
			},
			ready: () => ready++,
			time: () => now,
			send: (data) => {
				sent.push(data);
				return true;
			},
			finish: (data) => finish.push(data),
			on: (event, fn) => {
				events.set(event, fn);
				return () => events.delete(event);
			},
		};
		session = await connectHub({ onEnd: (value) => ends.push(value) });
		check("Hub ready called automatically once", ready === 1);
		check(
			"server host has no avatar",
			session.server &&
				!session.state.players["9"] &&
				Object.keys(session.state.players).length === 2,
		);
		check(
			"Hub handlers registered before ready",
			["start", "message", "leave", "time-up", "end"].every((k) =>
				events.has(k),
			),
		);
		check(
			"no authority simulation before Hub clock",
			!session.started &&
				session.send({ type: "turn", direction: 1 }).ok === false,
		);
		now = 0;
		events.get("start")();
		session.flush();
		check(
			"server starts without renderer or input",
			session.started && sent.length > 0,
		);
		const before = session.diagnostics().rejected;
		const initialDirection = session.state.players["0"].dir;
		const packet = {
			v: 1,
			e: session.expedition,
			t: "commands",
			combat: null,
			actions: [{ n: 1, action: { type: "turn", delta: 1 } }],
		};
		events.get("message")(packet, 0);
		check(
			"transport sender drives production command handler",
			session.state.players["0"].dir === (initialDirection + 1) % 4,
		);
		events.get("message")(packet, 0);
		check(
			"duplicate sender sequences rejected",
			session.diagnostics().rejected > before,
		);
		const rejected = session.diagnostics().rejected;
		events.get("message")({ ...packet, e: "previous-expedition" }, 0);
		check("old expedition rejected", session.diagnostics().rejected > rejected);
		events.get("message")(
			{ ...packet, actions: [{ n: 2, action: { type: "devJump", floor: 2 } }] },
			0,
		);
		check(
			"scored developer commands rejected",
			session.diagnostics().rejected > rejected + 1,
		);
		events.get("leave")({ id: 1, reason: "left" });
		check(
			"nonhost departure releases seat",
			session.diagnostics().participants.length === 1,
		);
		events.get("time-up")({ graceMs: 1000 });
		events.get("time-up")({ graceMs: 1000 });
		events.get("message")(
			{
				v: 1,
				e: session.expedition,
				t: "ack",
				r: session.diagnostics().hostRevision,
			},
			0,
		);
		for (let i = 0; i < 10 && !finish.length; i++) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			session.flush();
		}
		check("time-up finishes exactly once", finish.length === 1);
		check(
			"unfinished expedition honestly loses with current team IDs",
			finish[0]?.won === false && finish[0]?.standings?.[0]?.join() === "0",
		);
		events.get("end")({ reason: "finished" });
		const sentAtEnd = sent.length;
		now = 30000;
		session.flush();
		check(
			"end closes simulation, traffic and input",
			session.ended &&
				sent.length === sentAtEnd &&
				session.send({ type: "turn", direction: 1 }).ok === false,
		);
		check("end notification delivered once", ends.length === 1);
		check(
			"Hub packets respect size bound",
			sent.every(
				(p) => new TextEncoder().encode(JSON.stringify(p)).length <= 15500,
			),
		);
	} catch (error) {
		failures.push(`Hub lifecycle threw: ${error.stack}`);
	} finally {
		session?.closeSession?.();
		globalThis.AIHub = oldHub;
	}
	for (const kind of ["boss-phase", "downed"]) {
		const handlers = new Map();
		const outcomes = [];
		let testSession;
		try {
			globalThis.AIHub = {
				active: true,
				connect: async () => ({
					isHost: true,
					server: true,
					me: 9,
					host: 9,
					seed: 100,
					round: 3,
					limitMs: 900000,
					players: [{ id: 0, name: "Adventurer" }],
				}),
				ready: () => {},
				time: () => 0,
				send: () => true,
				finish: (value) => outcomes.push(value),
				on: (name, fn) => {
					handlers.set(name, fn);
					return () => handlers.delete(name);
				},
			};
			testSession = await connectHub();
			handlers.get("start")();
			if (kind === "boss-phase") {
				const s = testSession.state;
				s.floor = 2;
				for (const field of [
					"enemies",
					"loot",
					"doors",
					"features",
					"explored",
				])
					s[field] = s.floors[2][field];
				s.players["0"].x = 7;
				s.players["0"].y = 5;
				const boss = s.enemies.find((e) => e.kind === "minotaur");
				boss.phase = 2;
				boss.war = 40;
				boss.spirit = 50;
				s.encounter = {
					id: boss.id,
					enemies: [boss.id],
					round: 1,
					plans: {},
					deadline: null,
					startedTick: 0,
					preparation: true,
					safe: {},
				};
			} else {
				testSession.state.players["0"].spirit = 0;
				testSession.state.players["0"].down = true;
			}
			handlers.get("time-up")({ graceMs: 5000 });
			// Boss case deliberately never acknowledges: bounded final resync must
			// still report before Hub's five-second grace deadline.
			if (kind === "downed")
				handlers.get("message")(
					{
						v: 1,
						e: testSession.expedition,
						t: "ack",
						r: testSession.diagnostics().hostRevision,
					},
					0,
				);
			const began = performance.now();
			while (!outcomes.length && performance.now() - began < 3000)
				await new Promise((resolve) => setTimeout(resolve, 100));
			check(
				`${kind} time-up reports incomplete expedition within grace`,
				outcomes.length === 1 &&
					outcomes[0].won === false &&
					performance.now() - began < 5000,
			);
			handlers.get("end")({ reason: "finished" });
			const frozen = JSON.stringify(testSession.state);
			testSession.receive(
				{
					v: 1,
					e: testSession.expedition,
					t: "commands",
					actions: [{ n: 10, action: { type: "turn", delta: 1 } }],
				},
				"0",
				false,
			);
			testSession.flush();
			check(
				`${kind} end freezes authoritative state`,
				testSession.ended && JSON.stringify(testSession.state) === frozen,
			);
		} catch (error) {
			failures.push(`${kind} lifecycle threw: ${error.stack}`);
		} finally {
			testSession?.closeSession?.();
			globalThis.AIHub = oldHub;
		}
	}
	const oldPeer = globalThis.RTCPeerConnection;
	let fakePeer;
	class WaitingPeer {
		constructor() {
			fakePeer = this;
			this.listeners = new Set();
			this.iceGatheringState = "gathering";
			this.connectionState = "new";
			this.signalingState = "stable";
		}
		createDataChannel() {
			return {
				label: "tarmin-reliable",
				ordered: true,
				readyState: "connecting",
				close() {
					this.readyState = "closed";
				},
			};
		}
		async createOffer() {
			return { type: "offer", sdp };
		}
		async setLocalDescription(value) {
			this.localDescription = value;
		}
		addEventListener(_name, fn) {
			this.listeners.add(fn);
		}
		removeEventListener(_name, fn) {
			this.listeners.delete(fn);
		}
		close() {
			this.connectionState = "closed";
		}
	}
	let testLobby;
	try {
		globalThis.RTCPeerConnection = WaitingPeer;
		testLobby = createPeerLobby({ role: "host" });
		const gathering = testLobby.makeOffer().catch((error) => error.message);
		for (let i = 0; i < 5; i++) await Promise.resolve();
		testLobby.cancel();
		check(
			"cancel rejects pending ICE gathering and removes owned listener",
			(await gathering) === "Connection canceled." &&
				fakePeer.listeners.size === 0 &&
				fakePeer.connectionState === "closed",
		);
		let timeoutEnd = 0;
		testLobby = createPeerLobby({
			role: "host",
			timeoutMs: 1000,
			onEnd: () => timeoutEnd++,
		});
		await new Promise((resolve) => setTimeout(resolve, 1100));
		check(
			"unanswered invitation times out once and closes peer",
			timeoutEnd === 1 &&
				fakePeer.connectionState === "closed" &&
				testLobby.diagnostics().canceled,
		);
	} catch (error) {
		failures.push(`Peer cleanup threw: ${error.stack}`);
	} finally {
		testLobby?.cancel();
		globalThis.RTCPeerConnection = oldPeer;
	}
	return { count, failures };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
	const { count, failures } = await testNet();
	for (const failure of failures) console.error("FAIL network: " + failure);
	console.log(`${count - failures.length}/${count} network checks passed`);
	if (failures.length) process.exitCode = 1;
}
