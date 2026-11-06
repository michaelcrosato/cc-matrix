import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
export async function run() {
	let count = 0;
	const check = (condition, message) => {
		assert.ok(condition, message);
		count++;
	};
	const context = vm.createContext({
		console,
		TextEncoder,
		TextDecoder,
		Uint8Array,
		Uint32Array,
		Blob,
		Response,
		CompressionStream,
		DecompressionStream,
		btoa,
		atob,
		setTimeout,
		clearTimeout,
		crypto: globalThis.crypto,
		Date,
		Math,
	});
	vm.runInContext(
		fs.readFileSync(new URL("src/net/network.js", root), "utf8"),
		context,
	);
	const { Network } = context.NM;
	const p = Network.protocol;
	check(
		p.commandOf({ mx: 1, my: 0, ax: 0, ay: -1, fireId: 2 }).fireId === 2,
		"valid command preserved",
	);
	check(
		p.commandOf({ mx: NaN }) === null && p.commandOf({ ax: 8 }) === null,
		"non-finite and out-of-range commands rejected",
	);
	check(
		p.commandOf({ fireId: -1 }) === null &&
			p.commandOf({ interactId: 0.5 }) === null,
		"invalid discrete IDs rejected",
	);
	check(
		p.commandOf({ travel: "x".repeat(65) }) === null &&
			p.commandOf({ travel: "forest" }).travel === "forest",
		"travel selection bounded",
	);
	const state = {
		tick: 15,
		players: [{ seat: 1, x: 14, y: 55 }],
		enemies: [{ id: "rat-a", hp: 1 }],
		party: { ammo: 3, tools: ["axe"] },
		explored: Array.from({ length: 5000 }, (_, i) => i),
		events: [],
	};
	const packed = await p.packState(state);
	const unpacked = await p.unpackState(packed);
	check(
		JSON.stringify(unpacked) === JSON.stringify(state),
		"compressed full state roundtrip",
	);
	check(
		p.bytes(packed.data) < p.bytes(JSON.stringify(state)),
		"state compresses",
	);
	await assert.rejects(() =>
		p.unpackState({
			codec: "json",
			data: '{"tick":2,"players":[],"enemies":[]}',
		}),
	);
	count++;
	const signal = {
		app: "near-misses",
		v: 1,
		content: "near-misses-1",
		role: "host",
		nonce: "a".repeat(32),
		expires: Date.now() + 60000,
		description: { type: "offer", sdp: "v=0\r\n" },
	};
	const code = p.encodeSignal(signal);
	check(
		p.decodeSignal(code, "host").nonce === signal.nonce,
		"pairing signal roundtrip",
	);
	for (const bad of [
		"bad",
		p.encodeSignal({ ...signal, v: 99 }),
		p.encodeSignal({ ...signal, expires: Date.now() - 5000 }),
		p.encodeSignal({ ...signal, role: "guest" }),
	]) {
		assert.throws(() => p.decodeSignal(bad, "host"));
		count++;
	}
	const commands = [];
	const applied = [];
	const net = new Network({
		command: (seat, cmd) => commands.push({ seat, cmd }),
		getState: () => state,
		applyState: (s) => applied.push(s),
	});
	net.sessionNonce = "test";
	net._started = true;
	net.running = true;
	net.connected = true;
	net.role = "host";
	net.authority = true;
	net.localSeat = 1;
	const envelope = (data) => ({
		nm: 1,
		c: "near-misses-1",
		e: "test",
		...data,
	});
	const input = (seq) =>
		envelope({
			t: "input",
			seq,
			epoch: 3,
			cmd: { mx: 1, ax: 1 },
			actions: [{ key: "fireId", id: 1, ax: 1, ay: 0 }],
		});
	net._receive(input(1), 2);
	net._receive(input(1), 2);
	net._receive(input(2), 2);
	check(
		commands.filter((c) => c.cmd.fireId === 1).length === 1,
		"repeated packets and retransmitted press apply once",
	);
	check(
		commands[0].seat === 2 && commands[0].cmd.mx === 1,
		"guest assigned correct authority seat",
	);
	net._receive(
		envelope({
			t: "input",
			seq: 3,
			epoch: 3,
			cmd: { mx: Infinity },
			actions: [],
		}),
		2,
	);
	check(net.diagnostics.rejected === 1, "invalid numeric packet rejected");
	net._receive({ ...input(4), c: "old-content" }, 2);
	net._receive({ ...input(4), e: "other" }, 2);
	check(net.diagnostics.rejected === 3, "wrong version and nonce rejected");
	net.update(0.1);
	for (let i = 0; i < 6; i++) net.update(0.1);
	check(
		commands.at(-1).cmd.mx === 0 && commands.at(-1).cmd.fireId === 0,
		"held state cleared on heartbeat expiry",
	);
	const received = [];
	net.channel = {
		readyState: "open",
		bufferedAmount: 0,
		send: (text) => received.push(JSON.parse(text)),
	};
	for (let i = 0; i < 50; i++)
		net._enqueue({ t: "hello", role: "host", epoch: 1 });
	net._flush();
	check(
		received.length === 18 && net.diagnostics.maxPerSecond === 18,
		"all packet types share rolling send budget",
	);
	check(net.diagnostics.maxBytes <= 15000, "actual sends under size bound");
	const guest = new Network({ applyState: (s) => applied.push(s) });
	guest._started = true;
	guest.connected = true;
	guest.running = true;
	guest.authority = false;
	guest.localSeat = 2;
	guest.sessionNonce = "test";
	guest.sendInput({ ax: 1, fireId: 1 });
	guest.sendInput({ ax: 1, fireId: 0 });
	check(
		guest._pending.length === 1,
		"press shorter than send interval retained",
	);
	await guest._state({
		seq: 5,
		...packed,
		ack: { 2: { epoch: guest._epoch, ids: { fireId: 1 } } },
	});
	check(
		guest._pending.length === 0 && applied.length === 1,
		"snapshot acknowledgment retires discrete event",
	);
	await guest._state({ seq: 4, ...packed });
	check(applied.length === 1, "older snapshot ignored");
	const half = Math.floor(packed.data.length / 2);
	guest._part({
		seq: 6,
		index: 1,
		count: 2,
		codec: packed.codec,
		data: packed.data.slice(half),
	});
	check(applied.length === 1, "partial snapshot never applies");
	guest._part({
		seq: 6,
		index: 0,
		count: 2,
		codec: packed.codec,
		data: packed.data.slice(0, half),
	});
	await new Promise((resolve) => setTimeout(resolve, 30));
	check(applied.length === 2, "out-of-order state parts reassemble atomically");
	const badRole = new Network();
	badRole._started = true;
	badRole.sessionNonce = "test";
	badRole.authority = false;
	badRole._receive(input(1), 2);
	check(
		badRole.diagnostics.rejected === 1,
		"guest cannot accept peer authority commands",
	);
	const finishes = [];
	context.AIHub = { finish: (data) => finishes.push(data) };
	net.isHub = true;
	net.info = { players: [{ id: 0 }, { id: 1 }] };
	net._active = new Set([0, 1]);
	check(
		net.finish(true, { arrows: 4 }) && !net.finish(true, {}),
		"shared outcome idempotent",
	);
	check(
		JSON.stringify(finishes[0].standings) === "[[0,1]]" &&
			finishes[0].won === true,
		"active teammates tied in documented shape",
	);
	net._ended = false;
	net._finished = false;
	net._active.delete(1);
	net.finish(false, {});
	check(
		JSON.stringify(finishes[1].standings) === "[[0]]",
		"departed guest omitted from final active standings",
	);

	const handlers = new Map();
	let hubTime = -1000;
	let ready = 0;
	let startConfig;
	let ended = 0;
	let removed;
	const sent = [];
	const serverCommands = [];
	const serverInfo = {
		players: [
			{ id: 0, name: "Red" },
			{ id: 1, name: "Blue" },
		],
		me: 2,
		host: 2,
		isHost: true,
		server: true,
		round: 1,
		seed: 182,
	};
	context.AIHub = {
		seed: 182,
		connect: async (opts) => {
			assert.equal(opts.mode, "shared-world");
			assert.equal(JSON.stringify(opts.seats), "[1,2]");
			return serverInfo;
		},
		on: (event, fn) => {
			handlers.set(event, fn);
			return () => handlers.delete(event);
		},
		ready: () => {
			assert.ok(
				["message", "start", "leave", "time-up", "end"].every((key) =>
					handlers.has(key),
				),
			);
			ready++;
		},
		time: () => hubTime,
		send: (data) => {
			sent.push(data);
			return true;
		},
		finish: (data) => finishes.push(data),
	};
	const server = new Network({
		start: (data) => {
			startConfig = data;
		},
		command: (seat, cmd) => serverCommands.push({ seat, cmd }),
		getState: () => state,
		removePlayer: (seat) => {
			removed = seat;
		},
		ended: () => ended++,
	});
	check(await server.connectHub(), "managed session accepted");
	check(
		ready === 1 &&
			startConfig.role === "server" &&
			startConfig.localSeat === null &&
			startConfig.seats.length === 2,
		"dedicated authority readies once with no local ranger",
	);
	handlers.get("start")();
	server.update(0.01);
	check(
		!server.running && sent.length === 0,
		"negative common clock gates all gameplay traffic",
	);
	hubTime = 0;
	server.update(0.01);
	check(server.running, "authority begins at common playable instant");
	handlers.get("message")({ ...input(1), e: server.sessionNonce }, 0);
	check(
		serverCommands.some((c) => c.seat === 1 && c.cmd.fireId === 1),
		"server maps roster ID to real player seat",
	);
	handlers.get("leave")({ id: 1, reason: "left" });
	check(
		removed === 2 && server._active.size === 1,
		"Hub guest departure removes exactly its roster seat",
	);
	handlers.get("time-up")({ graceMs: 1000 });
	check(
		finishes.at(-1).won === false &&
			JSON.stringify(finishes.at(-1).standings) === "[[0]]",
		"time-up reports a valid active-party withdrawal",
	);
	handlers.get("end")({ reason: "finished" });
	const sendsBefore = sent.length;
	server.update(0.1);
	check(
		ended === 1 && !server.running && sent.length === sendsBefore,
		"end stops input and outbound traffic",
	);

	const priorApplied = applied.length;
	const inFlightDecode = guest._state({ seq: 7, ...packed });
	guest.sessionNonce = "new-connection";
	await inFlightDecode;
	check(
		applied.length === priorApplied,
		"old-connection asynchronous decode cannot contaminate a new handshake",
	);
	const packingPeer = new Network({ getState: () => state });
	packingPeer.authority = true;
	packingPeer.running = true;
	packingPeer.connected = true;
	packingPeer.sessionNonce = "old-connection";
	const inFlightEncode = packingPeer._makeSnapshot();
	packingPeer.sessionNonce = "new-connection";
	await inFlightEncode;
	check(
		packingPeer._queue.length === 0,
		"old-connection asynchronous encode cannot enter a fresh session queue",
	);
	return count;
}
