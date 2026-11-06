import fs from "node:fs";
import vm from "node:vm";

const log = [];
const c = vm.createContext({
	console: {
		log() {},
		warn(...a) {
			log.push(a.join(" "));
		},
		error(...a) {
			log.push(a.join(" "));
		},
	},
});
for (const f of [
	"vendor/engine/my-3d2dge.js",
	"src/content.js",
	"src/sim.js",
	"src/art.js",
	"src/audio.js",
	"src/net.js",
	"src/main.js",
])
	vm.runInContext(fs.readFileSync(f, "utf8"), c, { filename: f });
const T = c.TB,
	E = c.My3D2dge;
let count = 0;
const failures = [];
function check(name, test) {
	count++;
	try {
		if (typeof test === "function" ? test() : test) return;
		failures.push(name);
	} catch (e) {
		failures.push(name + ": " + e.message);
	}
}
const run = (o) => {
	const r = new T.Run(o);
	r.phase = "playing";
	r.damageGrace = 0;
	return r;
};
const place = (a, cell) => {
	a.m.place(...cell);
	a.prev = cell.slice();
	a.bufferTime = 0;
	a.route = null;
};
const step = (r, t, inputs = {}) => {
	for (let i = 0; i < Math.round(t * 120); i++) r.step(1 / 120, inputs);
};
check("all content validates", () =>
	T.FLOORS.every((f) => T.validate(f).length === 0),
);
check(
	"four distinct required layouts",
	() => new Set(T.FLOORS.map((f) => f.rows.join(""))).size >= 4,
);
check(
	"26 required rescues",
	() => T.FLOORS.reduce((n, f) => n + f.quota, 0) === 26,
);
check("disconnected content rejected", () => {
	const f = { ...T.FLOORS[0], rows: T.FLOORS[0].rows.slice() };
	f.rows[6] = "#." + "#".repeat(18) + "#";
	return T.validate(f).length > 0;
});
check(
	"quota validation",
	() => T.validate({ ...T.FLOORS[0], quota: 99 }).length > 0,
);
check(
	"missing quota rejected",
	() => T.validate({ ...T.FLOORS[0], quota: undefined }).length > 0,
);
check(
	"conflict validation",
	() => T.validate({ ...T.FLOORS[0], supply: [9, 11] }).length > 0,
);
check("room deck deterministic", () =>
	(() => {
		const a = new T.Run({ seed: 11 }),
			b = new T.Run({ seed: 11 });
		return JSON.stringify(a.rooms) === JSON.stringify(b.rooms);
	})(),
);
check("first teaching room is baby", () =>
	Array.from(
		{ length: 20 },
		(_, seed) => new T.Run({ seed }).rooms[0].kind === "baby",
	).every(Boolean),
);
check(
	"different seeds change room deck",
	() =>
		new Set(
			Array.from({ length: 20 }, (_, seed) =>
				new T.Run({ seed, floor: 4 }).rooms.map((r) => r.kind).join(","),
			),
		).size > 1,
);
check(
	"movement uses native grid mover",
	() => run().players[0].m instanceof E.GridMover,
);
check("wall blocks movement", () => {
	const r = run(),
		p = r.players[0];
	place(p, [1, 1]);
	step(r, 0.5, { 0: { dir: [-1, 0] } });
	return p.m.x === 1;
});
check("fractional diagonal intention rejected", () => {
	const r = run(),
		p = r.players[0];
	r.step(1 / 120, { 0: { dir: [0.5, 0.5] } });
	return p.m.x === 9 && p.m.y === 11;
});
check("continuous travel", () => {
	const r = run(),
		p = r.players[0];
	step(r, 0.1, { 0: { dir: [1, 0] } });
	return p.m.x > 9 && p.m.x < 10;
});
check("immediate reversal", () => {
	const r = run(),
		p = r.players[0];
	step(r, 0.12, { 0: { dir: [1, 0] } });
	const x = p.m.x;
	r.step(1 / 120, { 0: { dir: [-1, 0] } });
	return p.m.x < x;
});
check("diagonal rejected", () => {
	const r = run(),
		p = r.players[0];
	r.step(1 / 120, { 0: { dir: [1, 1] } });
	return p.m.x === 9 && p.m.y === 11;
});
check("buffered early turn", () => {
	const r = run(),
		p = r.players[0];
	place(p, [1, 11]);
	step(r, 0.22, { 0: { dir: [1, 0] } });
	step(r, 0.1, { 0: { dir: [0, -1] } });
	return p.m.y === 11 && p.m.x > 2;
});
check("carrying slows movement by 10%", () => {
	const a = run(),
		b = run();
	b.players[0].carried = "test";
	step(a, 0.1, { 0: { dir: [1, 0] } });
	step(b, 0.1, { 0: { dir: [1, 0] } });
	return Math.abs((b.players[0].m.x - 9) / (a.players[0].m.x - 9) - 0.9) < 0.01;
});
check("mouse route follows graph", () => {
	const r = run();
	r.enemies = [];
	r.step(1 / 120, { 0: { route: [7, 9] } });
	step(r, 3);
	return !!r.players[0].carried;
});
check("manual direction cancels route", () => {
	const r = run();
	r.players[0].route = [1, 1];
	r.step(1 / 120, { 0: { dir: [1, 0] } });
	return r.players[0].route === null;
});
check(
	"swept crossing catches contact",
	() =>
		T.swept(
			{ prev: [0, 0], m: { x: 1, y: 0 } },
			{ prev: [1, 0], m: { x: 0, y: 0 } },
		) === 0,
);
check("pickup reserves reachable home", () => {
	const r = run(),
		p = r.players[0];
	place(p, r.rooms[0].cell);
	r.reveal(p);
	return (
		p.carried &&
		r.homes[p.home].reserved === p.carried &&
		r.grid.path(r.rooms[0].cell, r.homes[p.home].cell).length
	);
});
check("one passenger limit", () => {
	const r = run(),
		p = r.players[0];
	place(p, r.rooms[0].cell);
	r.reveal(p);
	const id = p.carried;
	place(p, r.rooms[1].cell);
	r.reveal(p);
	return p.carried === id && r.rooms[1].status === "hidden";
});
check("co-op reservations distinct", () => {
	const r = run({ seats: [0, 1] });
	r.players.forEach((p, i) => {
		place(p, r.rooms[i].cell);
		r.reveal(p);
	});
	return (
		r.players.every((p) => p.carried) && r.players[0].home !== r.players[1].home
	);
});
check("unavailable home leaves baby intact", () => {
	const r = run(),
		p = r.players[0];
	r.homes.forEach((h) => {
		h.reserved = "busy";
	});
	place(p, r.rooms[0].cell);
	r.reveal(p);
	return !p.carried && r.rooms[0].status === "hidden" && r.score === 0;
});
check("delivery exactly once", () => {
	const r = run(),
		p = r.players[0];
	place(p, r.rooms[0].cell);
	r.reveal(p);
	place(p, r.homes[p.home].cell);
	r.deliver(p);
	r.deliver(p);
	return r.score === 500 && r.delivered === 1 && r.rescued === 1 && !p.carried;
});
check("drop returns revealed passenger", () => {
	const r = run(),
		p = r.players[0];
	place(p, r.rooms[0].cell);
	r.reveal(p);
	p.invuln = 0;
	r.hit(p);
	return (
		r.rooms[0].status === "revealed" &&
		!p.carried &&
		r.homes.every((h) => h.reserved === null)
	);
});
check("recovery never repeats discovery points", () => {
	const r = run(),
		p = r.players[0];
	place(p, r.rooms[0].cell);
	r.reveal(p);
	r.drop(p);
	r.reveal(p);
	return r.score === 100;
});
check("leaving releases passenger and reservation", () => {
	const r = run({ seats: [0, 1] }),
		p = r.players[1];
	place(p, r.rooms[0].cell);
	r.reveal(p);
	r.leave(1);
	return (
		!p.active &&
		!p.carried &&
		r.rooms[0].status === "revealed" &&
		r.homes.every((h) => h.seat !== 1)
	);
});
check("bomb costs exactly one, duplicate edge rejected", () => {
	const r = run(),
		p = r.players[0];
	r.plant(p, { bomb: true, bombSeq: 1 });
	r.plant(p, { bomb: true, bombSeq: 1 });
	return r.stock === 2;
});
check("one bomb for team", () => {
	const r = run({ seats: [0, 1] });
	r.plant(r.players[0], { bomb: true, bombSeq: 1 });
	r.plant(r.players[1], { bomb: true, bombSeq: 1 });
	return r.stock === 2 && r.bomb.seat === 0;
});
check("empty feedback no negative stock", () => {
	const r = run();
	r.stock = 0;
	r.plant(r.players[0], { bomb: true, bombSeq: 1 });
	return r.stock === 0 && !r.bomb && r.events.at(-1).type === "empty";
});
check("expiration frees slot", () => {
	const r = run();
	r.enemies = [];
	r.plant(r.players[0], { bomb: true, bombSeq: 1 });
	step(r, 6.1);
	return !r.bomb;
});
check("localized stun precedes damage", () => {
	const r = run(),
		p = r.players[0],
		b = r.enemies[0];
	place(p, [5, 6]);
	place(b, [5, 6]);
	b.emerge = 0;
	p.invuln = 0;
	r.plant(p, { bomb: true, bombSeq: 1 });
	r.step(1 / 120);
	return r.lives === 3 && b.stun > 0 && r.stock === 2;
});
check("stun score only once", () => {
	const r = run(),
		p = r.players[0],
		b = r.enemies[0];
	place(p, [5, 6]);
	place(b, [5, 6]);
	b.emerge = 0;
	r.plant(p, { bomb: true, bombSeq: 1 });
	r.step(1 / 120);
	const s = r.score;
	b.stun = 0;
	r.plant(p, { bomb: true, bombSeq: 2 });
	r.step(1 / 120);
	return r.score === s;
});
check("stun recovers to blue age zero", () => {
	const r = run(),
		b = r.enemies[0];
	b.stun = 0.01;
	b.state = "stunned";
	b.age = 50;
	b.emerge = 0;
	r.updateEnemy(b, 0.02);
	return b.state === "blue" && b.age === 0;
});
check("room beetle has emergence grace", () => {
	const r = run({ floor: 1 }),
		p = r.players[0],
		room = r.rooms.find((r) => r.kind === "beetle");
	place(p, room.cell);
	p.invuln = 0;
	r.reveal(p);
	r.step(1 / 120);
	return r.lives === 3 && r.enemies.at(-1).emerge > 1;
});
check("LOS blocked by walls", () => {
	const r = run(),
		p = r.players[0],
		b = r.enemies[0];
	place(b, [1, 2]);
	place(p, [5, 2]);
	return !r.los(b, p);
});
check("yellow sees straight corridors", () => {
	const r = run(),
		p = r.players[0],
		b = r.enemies[0];
	place(b, [1, 1]);
	place(p, [5, 1]);
	b.state = "yellow";
	r.choose(b);
	return b.sighted && b.lastSeen[0] === 5;
});
check("blue ignores target", () => {
	const r = run(),
		p = r.players[0],
		b = r.enemies[0];
	b.state = "blue";
	place(p, [19, 11]);
	r.choose(b);
	return b.target === null && b.lastSeen === null;
});
check("red routes around corner", () => {
	const r = run(),
		p = r.players[0],
		b = r.enemies[0];
	place(b, [1, 1]);
	place(p, [5, 3]);
	b.state = "red";
	return r.choose(b) && b.target === 0;
});
check("enemy target hysteresis", () => {
	const r = run({ seats: [0, 1] }),
		b = r.enemies[0];
	place(b, [10, 11]);
	place(r.players[0], [8, 11]);
	place(r.players[1], [11, 11]);
	b.target = 0;
	return r.target(b).seat === 0;
});
check("escalation warnings precede state", () => {
	const r = run(),
		b = r.enemies[0];
	b.emerge = 0;
	b.age = 17;
	r.updateEnemy(b, 0.1);
	const warn = r.events.some((e) => e.type === "warning");
	b.age = 18;
	r.updateEnemy(b, 0.1);
	return warn && b.state === "yellow";
});
check("supply fresh entry plus recharge", () => {
	const r = run(),
		p = r.players[0];
	r.enemies = [];
	r.stock = 0;
	place(p, r.content.supply);
	r.step(1 / 120);
	const stock = r.stock;
	step(r, 6.1);
	return stock === 2 && r.stock === 2 && r.supply.ready;
});
check("re-entering supply collects again", () => {
	const r = run(),
		p = r.players[0];
	r.enemies = [];
	r.stock = 0;
	place(p, r.content.supply);
	r.step(1 / 120);
	step(r, 6.1);
	place(p, [9, 6]);
	r.step(1 / 120);
	place(p, r.content.supply);
	r.step(1 / 120);
	return r.stock === 4;
});
check("stock capped five", () => {
	const r = run();
	r.stock = 4;
	place(r.players[0], r.content.supply);
	r.step(1 / 120);
	return r.stock === 5;
});
check("three team losses end run", () => {
	const r = run(),
		p = r.players[0];
	for (let i = 0; i < 3; i++) {
		p.invuln = 0;
		p.hurt = 0;
		r.damageGrace = 0;
		r.hit(p);
	}
	return r.lives === 0 && r.phase === "lost";
});
check("team damage grace", () => {
	const r = run({ seats: [0, 1] });
	for (const p of r.players) {
		p.invuln = 0;
		r.hit(p);
	}
	return r.lives === 2;
});
check("safe respawn avoids threat", () => {
	const r = run(),
		p = r.players[0];
	for (const b of r.enemies) {
		place(b, r.content.spawns[0]);
		b.emerge = 0;
	}
	r.safeRespawn(p);
	return (
		Math.hypot(p.m.x - r.enemies[0].m.x, p.m.y - r.enemies[0].m.y) > 1.5 &&
		p.invuln > 0
	);
});
check("terminal world freezes", () => {
	const r = run();
	r.phase = "lost";
	const score = r.score,
		x = r.players[0].m.x;
	step(r, 2, { 0: { dir: [1, 0], bomb: true, bombSeq: 1 } });
	return r.score === score && r.players[0].m.x === x && !r.bomb;
});
check("floor transition clears references", () => {
	const r = run();
	r.plant(r.players[0], { bomb: true, bombSeq: 1 });
	r.startFloor(1);
	return (
		!r.bomb &&
		r.homes.every((h) => h.reserved === null) &&
		r.players.every((p) => !p.carried) &&
		r.rooms.every((q) => q.id.startsWith("f1"))
	);
});
check("live sliders constrain escalation", () => {
	const r = run();
	r.setBalance("yellowAt", 36);
	r.setBalance("redAt", 15);
	return r.practice && r.balance.redAt >= r.balance.yellowAt + 3;
});
check("reset defaults immutable", () => {
	const r = run();
	r.setBalance("playerSpeed", 5);
	r.resetBalance();
	return r.balance.playerSpeed === 3.5 && Object.isFrozen(T.DEFAULTS);
});
check("online stop intention freezes movement and cancels route", () => {
	const r = run();
	r.enemies = [];
	r.step(1 / 120, { 0: { route: [1, 1] } });
	const p = r.players[0],
		x = p.m.x,
		y = p.m.y;
	step(r, 0.5, { 0: { stop: true } });
	return p.m.x === x && p.m.y === y && p.route === null;
});
check("snapshot includes authoritative station entry", () => {
	const r = run();
	r.players[0].supplyInside = true;
	return r.snapshot().players[0].supplyInside === true;
});
// Production input-driven campaigns. No invulnerability, teleports, objective edits, forced clears or balance changes.
const reports = [];
for (const [mode, seats, seed] of [
	["solo", [0], 5],
	["coop", [0, 1], 2],
]) {
	const r = new T.Run({ seats, seed, mode }),
		b = new T.Bot();
	const floors = new Set();
	for (
		let tick = 0;
		tick < 120 * 1200 && !["won", "lost"].includes(r.phase);
		tick++
	) {
		floors.add(r.floor);
		r.step(1 / 120, b.inputs(r));
	}
	reports.push({
		mode,
		phase: r.phase,
		floors: floors.size,
		rescued: r.rescued,
		lives: r.lives,
		seconds: r.elapsed,
		stats: r.stats,
	});
	check(
		mode + " full production campaign",
		r.phase === "won" &&
			r.rescued === 26 &&
			floors.size === 5 &&
			!r.practice &&
			!r.god,
	);
	if (mode === "solo")
		check(
			"ordinary run exercises defence supply escalation and hits",
			r.stats.triggers > 0 &&
				r.stats.refills > 0 &&
				r.stats.escalations > 0 &&
				r.stats.hits > 0 &&
				r.stats.decoys > 0,
		);
}
fs.writeFileSync(
	"build/campaign-evidence.json",
	JSON.stringify(reports, null, 2),
);
const game = T.app.game;
game.advance(0.1);
T.app.start();
game.advance(2.5);
check(
	"native game stepping transitions to play",
	T.app.run.phase === "playing",
);
game.advance(0.1, { draw: true });
check("native draw no errors", () => !game.errors.length);
check(
	"music default 10%",
	() => game.settings.music === 0.1 && game.audio.musicVolume === 0.1,
);
check("PS glyph default", () => game.settings.glyphs === "playstation");
check(
	"native fixed camera cannot cycle",
	() => game.o.views.length === 1 && game.view.id === "overhead",
);
console.log(JSON.stringify({ count, failures }));
process.exitCode = failures.length ? 1 : 0;
