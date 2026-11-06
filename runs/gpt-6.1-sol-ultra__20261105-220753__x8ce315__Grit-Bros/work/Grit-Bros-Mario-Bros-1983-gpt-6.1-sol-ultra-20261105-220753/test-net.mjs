import { readFile } from "node:fs/promises";
const { GritNet } = await import(
	"data:text/javascript;base64," +
		Buffer.from(
			await readFile(new URL("./net.js", import.meta.url), "utf8"),
		).toString("base64")
);
const failures = [];
let count = 0;
const check = (pass, name) => {
	count++;
	if (!pass) failures.push(name);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const solo = new GritNet();
check((await solo.connect()) === null, "standalone needs no hub");
check(
	solo.tick(1 / 60, {}) && solo.isHost && !solo.active,
	"standalone host simulates",
);
check(
	solo.inputs({ x: 8, jump: 1 }, { x: -8 })[0].x === 1 &&
		solo.inputs({}, { x: -8 })[1].x === -1,
	"input clamping",
);
let hostStarts = 0,
	guestStarts = 0,
	seen = null;
const host = new GritNet({ onStart: () => hostStarts++ });
const guest = new GritNet({
	onStart: () => guestStarts++,
	onSnapshot: (state) => {
		seen = state;
	},
});
const code = host.hostRoom();
guest.joinRoom(code);
await wait(100);
check(
	host.connected && guest.connected && hostStarts === 1 && guestStarts === 1,
	"two-tab room handshake",
);
check(host.count === 2 && guest.me === 1, "room seats");
guest.tick(0.08, { x: 1, jump: true, action: true });
await wait(50);
check(
	host.inputs()[1].x === 1 && host.inputs()[1].jump && host.inputs()[1].action,
	"guest input arrives at host",
);
host.tick(0.08, {}, () => ({ score: 300, players: [{ x: 2 }, { x: 3 }] }));
await wait(50);
check(
	seen?.score === 300 && seen.players[1].x === 3,
	"host snapshot reaches guest",
);
check(!guest.tick(0.08, {}), "guest does not simulate");
host.receive({ t: "i", n: -1, input: { x: -1 } }, 1);
check(host.inputs()[1].x === 1, "stale input ignored");
guest.leaveRoom();
await wait(50);
check(
	!host.connected && host.inputs()[1].x === 0,
	"leave releases partner controls",
);
const returning = new GritNet();
returning.joinRoom(code);
await wait(75);
returning.tick(0.08, { x: -1 });
await wait(50);
check(
	host.inputs()[1].x === -1,
	"replacement partner starts a fresh input sequence",
);
returning.dispose();
host.dispose();
guest.dispose();
solo.dispose();
const handlers = new Map();
let finished = null,
	starts = 0,
	ends = 0;
let clock = -Infinity;
const client = {
	active: true,
	host: 2,
	me: 2,
	isHost: true,
	server: true,
	time: () => clock,
	connect: async () => ({
		isHost: true,
		server: true,
		me: 2,
		players: [{ id: 0 }, { id: 1 }],
	}),
	on: (event, fn) => {
		handlers.set(event, fn);
		return () => handlers.delete(event);
	},
	ready: () => {},
	send: () => true,
	finish: (result) => {
		finished = result;
	},
};
globalThis.AIHub = client;
const server = new GritNet({
	onStart: () => starts++,
	onEnd: () => ends++,
	getResult: () => ({ score: 900, won: true }),
});
await server.connect();
check(!server.tick(0.1, {}), "hub waits for synchronized start");
handlers.get("start")();
clock = -100;
check(
	starts === 1 && !server.tick(0.1, {}) && server.countdown === 1,
	"hub countdown is gated",
);
clock = 0;
check(server.tick(0.1, {}), "headless server simulates at start");
handlers.get("message")({ t: "i", n: 1, input: { x: -1 } }, 0);
handlers.get("message")({ t: "i", n: 1, input: { x: 1 } }, 1);
check(
	server.inputs()[0].x === -1 && server.inputs()[1].x === 1,
	"dedicated server independent remote seats",
);
handlers.get("time-up")();
check(
	finished?.won === true &&
		finished.scores[0] === 900 &&
		finished.standings[0].join(",") === "0,1",
	"host finishes valid team result on time-up",
);
handlers.get("end")({ reason: "finished" });
check(
	server.ended && ends === 1 && !server.tick(0.1, {}),
	"end freezes network and world",
);
server.dispose();
delete globalThis.AIHub;
for (const failure of failures) console.error("FAIL " + failure);
console.log(`${count} multiplayer checks, ${failures.length} failures`);
process.exitCode = failures.length ? 1 : 0;
