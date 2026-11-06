import { ExpeditionNet } from "../network.js";

const failures = [];
let checks = 0;
const check = (condition, label) => {
	checks++;
	if (!condition) failures.push(label);
};
const packets = [];
let accept = true;
let result;
const savedHub = globalThis.AIHub;
globalThis.AIHub = {
	host: 0,
	send(data, options) {
		if (accept) packets.push({ data, options });
		return accept;
	},
	finish(value) {
		result = value;
	},
};
try {
	const guest = new ExpeditionNet();
	Object.assign(guest, { mode: "hub", isHost: false, connected: true, me: 1 });
	guest._lastInputAt = performance.now();
	check(
		!guest.sendInput({ x: 1, jump: true }),
		"A high-frequency input is throttled",
	);
	guest._lastInputAt = -Infinity;
	guest.sendInput({ x: 0, jump: false });
	check(
		packets.at(-1)?.data.input.jump && packets.at(-1)?.data.input.x === 0,
		"A throttled jump survives while movement uses the latest axis",
	);
	check(
		packets.at(-1)?.options.reliable === true,
		"Jump events use reliable Hub delivery",
	);
	guest.sendInput({ x: 0, jump: false }, true);
	check(
		!packets.at(-1)?.data.input.jump && !packets.at(-1)?.options.reliable,
		"A delivered edge is consumed exactly once",
	);
	guest._lastInputAt = performance.now();
	guest.sendInput({ action: true });
	guest.sendInput({ action: false }, true);
	check(
		packets.at(-1)?.data.input.action,
		"A throttled action survives the next render frame",
	);
	accept = false;
	guest.sendInput({ jump: true }, true);
	accept = true;
	guest.sendInput({ jump: false }, true);
	check(
		packets.at(-1)?.data.input.jump,
		"An edge rejected by the Hub rate limiter is retried",
	);
	guest.sendInput({ pauseRequest: true }, true);
	check(
		packets.at(-1)?.data.input.pauseRequest && packets.at(-1)?.options.reliable,
		"Guest pause requests use reliable delivery",
	);
	const host = new ExpeditionNet();
	Object.assign(host, {
		mode: "hub",
		isHost: true,
		players: [{ id: 0 }, { id: 1 }],
	});
	host.finish({ scores: { 0: 100, 1: 100 }, stats: { jumps: 3, bells: 1 } });
	check(
		result?.stats?.[0]?.jumps === 3 && result?.stats?.[1]?.bells === 1,
		"Team statistics use the required per-player Hub shape",
	);
} finally {
	if (savedHub === undefined) delete globalThis.AIHub;
	else globalThis.AIHub = savedHub;
}
for (const failure of failures) process.stdout.write(`FAIL ${failure}\n`);
process.stdout.write(
	`${checks - failures.length}/${checks} network regression checks passed\n`,
);
process.exitCode = failures.length ? 1 : 0;
