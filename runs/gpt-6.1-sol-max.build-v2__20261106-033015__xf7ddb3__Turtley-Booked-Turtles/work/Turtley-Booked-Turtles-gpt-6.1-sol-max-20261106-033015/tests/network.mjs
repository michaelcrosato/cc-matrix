import fs from "node:fs";
import vm from "node:vm";

const c = vm.createContext({ console });
for (const f of [
	"vendor/engine/my-3d2dge.js",
	"src/content.js",
	"src/sim.js",
	"src/net.js",
])
	vm.runInContext(fs.readFileSync(f, "utf8"), c);
const T = c.TB;
let count = 0,
	failures = [];
const check = (n, ok) => {
	count++;
	if (!ok) failures.push(n);
};
function network({ server = false, seed = 9, loss = 0, latency = 0 } = {}) {
	const copies = [],
		queue = [],
		rng = new T.Stream(77, "network");
	let clock = -3000,
		wall = 0;
	const sent = [];
	function api(id, isHost) {
		const events = {};
		return {
			id,
			isHost,
			events,
			on(k, fn) {
				events[k] = fn;
			},
			ready() {
				this.readies = (this.readies || 0) + 1;
			},
			time: () => clock,
			send(data, o = {}) {
				sent.push({
					id,
					at: wall,
					size: JSON.stringify(data).length,
					type: data.type,
				});
				for (const other of copies)
					if (
						other.info.me !== id &&
						(o.to === undefined || other.info.me === o.to)
					) {
						if (!o.reliable && rng.next() < loss) continue;
						queue.push({
							at:
								wall +
								latency +
								(o.reliable || latency === 0 ? 0 : rng.next() * 0.05),
							data: JSON.parse(JSON.stringify(data)),
							from: id,
							to: other,
						});
					}
				return true;
			},
			finish(result) {
				this.finishes = (this.finishes || 0) + 1;
				this.result = result;
			},
			emit(k, v) {
				events[k]?.(v);
			},
		};
	}
	const hostId = server ? "server" : 0,
		ids = server ? ["server", 0, 1] : [0, 1];
	for (const id of ids) {
		const info = {
			me: id,
			isHost: id === hostId,
			server: id === "server",
			host: hostId,
			round: 1,
			seed,
			players: [{ id: 0 }, { id: 1 }],
		};
		const a = api(id, info.isHost);
		copies.push(new T.Network(info, a));
	}
	const host = copies.find((n) => n.run),
		bot = new T.Bot();
	const tick = (dt = 1 / 120) => {
		wall += dt;
		clock += dt * 1000;
		queue.sort((a, b) => a.at - b.at);
		while (queue.length && queue[0].at <= wall) {
			const m = queue.shift();
			m.to.receive(m.data, m.from);
		}
		for (const n of copies) {
			let input = {};
			if (!n.info.server) {
				const planner = n.planner(),
					p = planner.players.find((p) => p.seat === n.info.me);
				input = bot.intent(planner, p);
			}
			n.update(dt, input);
		}
	};
	return {
		copies,
		host,
		bot,
		tick,
		sent,
		queue,
		start() {
			copies.forEach((n) => {
				n.api.emit("start");
			});
		},
		clock: () => clock,
	};
}
const n = network();
for (let i = 0; i < 120; i++) n.tick();
check(
	"ready exactly once on all copies",
	n.copies.every((n) => n.api.readies === 1),
);
check("world held before start", n.host.run.tick === 0);
n.start();
for (let i = 0; i < 120; i++) n.tick();
check("negative Hub clock holds world", n.host.run.tick === 0);
for (let i = 0; i < 120 * 5; i++) n.tick();
check("nonnegative Hub clock starts world", n.host.run.tick > 0);
const host = n.host,
	r = host.run,
	p = r.players[1],
	valid = {
		v: 1,
		run: host.id,
		type: "input",
		seq: 100,
		floor: r.floor,
		dir: [1, 0],
		bombSeq: 1,
		route: null,
	};
host.receive(valid, 91);
check("unauthenticated seat rejected", !host.accepted[91]);
host.receive({ ...valid, dir: [1, 1] }, 1);
check(
	"diagonal intention rejected",
	!host.accepted[1] || host.accepted[1].seq < 100,
);
host.receive({ ...valid, run: "wrong" }, 1);
check("wrong run rejected", !host.accepted[1] || host.accepted[1].seq < 100);
host.receive({ ...valid, seq: 10000 }, 1);
const accepted = host.accepted[1]?.seq;
host.receive({ ...valid, seq: 9999 }, 1);
check("reordered input cannot rewind", host.accepted[1]?.seq === accepted);
host.receive({ ...valid, seq: 10001, floor: 4 }, 1);
check("wrong floor rejected", host.accepted[1]?.seq === accepted);
const client = n.copies[1],
	before = client.lastSeq;
client.receive(
	{ v: 1, run: host.id, type: "state", seq: 99999, state: r.snapshot() },
	92,
);
check("only host state accepted", client.lastSeq === before);
check(
	"client planner has authoritative floor timing",
	client.planner().floorTime === client.state.floorTime,
);
const auth = client.state.players.find((p) => p.seat === client.info.me);
client.predict = {
	...auth,
	m: new c.My3D2dge.GridMover({ cx: 50, cy: 50 }),
	prev: [50, 50],
	bufferTime: 0,
};
client.lastReceived = client.time;
client.update(1 / 120, {});
check(
	"prediction cap resets graph coordinates as well as position",
	client.predict.m.cx === auth.cx && client.predict.m.cy === auth.cy,
);
const b = host.run.players[1];
b.m.place(...r.rooms.find((q) => q.kind === "baby").cell);
r.reveal(b);
host.api.emit("leave", { id: 1 });
check(
	"leave releases home and baby",
	!b.active && !b.carried && r.homes.every((h) => h.seat !== 1),
);
host.api.emit("time-up", { graceMs: 1000 });
host.api.emit("time-up", { graceMs: 1000 });
check(
	"only host finishes once on time-up",
	host.api.finishes === 1 && host.api.result.won === false,
);
const sentBefore = n.sent.length;
for (const x of n.copies) x.api.emit("end", { reason: "finished" });
for (let i = 0; i < 120; i++) n.tick();
check("end stops outgoing traffic", n.sent.length === sentBefore);
// Dedicated host and packet recovery exercise real serialized messages through the same adapter.
const reports = [];
const configs = process.argv.includes("--search")
	? Array.from({ length: 12 }, (_, i) => ({
			server: true,
			seed: i + 1,
			loss: 0,
			latency: 0,
		}))
	: [
			{ server: true, seed: 3, loss: 0, latency: 0 },
			{ server: true, seed: 9, loss: 0.05, latency: 0.15 },
		];
for (const opts of configs) {
	const w = network(opts);
	w.start();
	const seenFloors = new Set();
	for (let i = 0; i < 120 * 1400 && !w.host.finished; i++) {
		w.tick();
		seenFloors.add(w.host.run.floor);
	}
	for (let i = 0; i < 60; i++) w.tick();
	const r = w.host.run;
	reports.push({
		opts,
		phase: r.phase,
		rescued: r.rescued,
		lives: r.lives,
		seconds: r.elapsed,
		stats: r.stats,
		snapshots: w.host.snapSeq,
	});
	if (!process.argv.includes("--search"))
		check(
			"dedicated synchronized campaign " + opts.loss + " seed " + opts.seed,
			opts.loss > 0
				? ["won", "lost"].includes(r.phase)
				: r.phase === "won" && r.rescued === 26 && seenFloors.size === 5,
		);
	check(
		"all clients recover complete objective state " + opts.loss,
		w.copies.every(
			(n) =>
				n.state.rescued === r.rescued &&
				n.state.score === r.score &&
				n.state.floor === r.floor,
		),
	);
	check(
		"only dedicated host reports result " + opts.loss,
		w.copies.filter((n) => n.api.finishes).length === 1 &&
			w.host.api.finishes === 1,
	);
	check(
		"network payload within 16 KB " + opts.loss,
		w.sent.every((s) => s.size <= 16384),
	);
	const buckets = new Map();
	let rateOkay = true;
	for (const s of w.sent) {
		const q = buckets.get(s.id) || [];
		while (q.length && s.at - q[0] >= 1) q.shift();
		q.push(s.at);
		buckets.set(s.id, q);
		if (q.length > 20) rateOkay = false;
	}
	check("bounded message cadence " + opts.loss, rateOkay);
	if (process.argv.includes("--search") && r.phase === "won") break;
}
fs.writeFileSync(
	process.argv.includes("--search")
		? "build/network-search.json"
		: "build/network-campaign-evidence.json",
	JSON.stringify(reports, null, 2),
);
console.log(JSON.stringify({ count, failures }));
process.exitCode = failures.length ? 1 : 0;
