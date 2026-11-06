import vm from "node:vm";
import { readFileSync, writeFileSync } from "node:fs";
const dir = new URL("../", import.meta.url);
export function load(includeEngine = false) {
	const ctx = { console };
	vm.createContext(ctx);
	for (const f of [
		...(includeEngine ? ["vendor/engine/my-3d2dge.js"] : []),
		...["tuning", "content", "simulation", "pilot", "network"].map(
			(f) => "src/" + f + ".js",
		),
	])
		vm.runInContext(readFileSync(new URL(f, dir), "utf8"), ctx, {
			filename: f,
		});
	return ctx;
}
export async function run(check) {
	const B = load().BCP,
		tick = (w, s) => {
			for (let i = 0; i < Math.ceil(s * 120); i++) B.step(w);
		},
		base = () => {
			const w = B.createRun({ seed: 11 });
			w.status = "live";
			w.pending = [
				{
					id: "later",
					at: 500,
					kind: "worker",
					x: 40,
					tier: 0,
					dir: 1,
					reward: "later",
				},
			];
			w.obstacles = [];
			w.bees = [];
			w.bird.state = "retreat";
			w.bird.timer = 99;
			w.flowers = [];
			w.scheduledGrowth = [];
			for (const p of w.players) p.cool = 0;
			return w;
		};
	const bee = (w, x, tier = 3, kind = "worker", reward = "fixture") =>
		B.spawnBee(w, { x, tier, kind, dir: 1, reward });
	const pulse = (w, x, y = 282, left = 2) => {
		w.pulses.push({
			id: w.nextId++,
			x,
			y,
			seat: 1,
			left,
			hitIds: [],
			born: [],
		});
	};
	{
		const w = base(),
			p = w.players[0];
		B.applyAction(w, 1, { move: 1, fire: true });
		tick(w, 0.5);
		check(
			"move and fire are simultaneous",
			p.x > 350 && w.stats.shots >= 3 && p.ammo === 56 - w.stats.shots,
		);
		const before = w.stats.shots;
		B.clearActions(w);
		tick(w, 0.5);
		check("release stops repeated spray", before === w.stats.shots);
	}
	{
		const w = base();
		w.tuning.beeSpeed = 0;
		bee(w, 320, 4);
		bee(w, 320, 3, "fast", "second");
		bee(w, 320, 2, "worker", "third");
		pulse(w, 320);
		tick(w, 0.32);
		check(
			"swept pulse hits two bees and ignores its newborn comb",
			w.stats.hits === 2 &&
				w.obstacles.length === 2 &&
				w.bees.length === 1 &&
				w.score === 1100,
		);
		check(
			"new combs remain visible colliders",
			w.obstacles.every((o) => Number.isInteger(o.id) && Number.isFinite(o.x)),
		);
	}
	{
		const w = base();
		bee(w, 320, 2);
		B.placeComb(w, 320, 5, false, "block");
		pulse(w, 320);
		tick(w, 0.5);
		check(
			"an existing comb consumes a pulse before the bee",
			w.stats.hits === 0 && w.bees.length === 1 && w.obstacles.length === 0,
		);
	}
	{
		const w = base();
		const a = bee(w, 200, 3);
		B.placeComb(w, 224, 3, false, "route");
		tick(w, 0.3);
		check(
			"worker comb contact reverses and descends exactly one tier",
			a.tier === 4 && a.dir === -1,
		);
		const f = bee(w, 200, 3, "fast", "express");
		tick(w, 0.45);
		check(
			"fast bee ignores comb routing",
			f.tier === 3 && f.dir === 1 && f.x > 224,
		);
		const w2 = base(),
			b = bee(w2, 601, 0);
		tick(w2, 0.4);
		check("boundary transition is atomic", b.tier === 1 && b.dir === -1);
	}
	{
		const w = base();
		B.placeComb(w, 72, 3, false, "wall");
		const b = bee(w, 43, 3);
		tick(w, 1.7);
		check(
			"verified geometric pocket constructs a hive",
			!w.bees.includes(b) && w.obstacles.some((o) => o.kind === "hive"),
		);
		const w2 = base();
		B.placeComb(w2, 72, 4, false, "below");
		const open = bee(w2, 43, 3);
		tick(w2, 1.7);
		check(
			"a comb on another tier cannot falsely trap a worker",
			w2.bees.includes(open) && w2.stats.hives === 0,
		);
		const w3 = base();
		B.placeComb(w3, 72, 3, false, "wall");
		const c = bee(w3, 43, 3);
		tick(w3, 0.5);
		w3.obstacles = [];
		tick(w3, 1);
		check(
			"removing a pocket boundary cancels construction",
			w3.stats.hives === 0 && c.state === "sweep" && c.trap === 0,
		);
	}
	{
		const w = base();
		const o1 = B.placeComb(w, 320, 3, false, "a"),
			o2 = B.placeComb(w, 320, 3, true, "b");
		check(
			"same-cell conversions select distinct deterministic free cells",
			o1.x !== o2.x && Math.abs(o1.x - o2.x) === 24,
		);
	}
	{
		const w = base();
		w.bird = {
			id: 3,
			x: 360,
			y: 170,
			state: "idle",
			target: 0,
			timer: 1,
			irritation: 0,
			call: 0,
			mark: 0,
			caller: 0,
		};
		B.applyAction(w, 1, { call: 1, aim: 320 });
		B.step(w);
		check("invalid call costs no cooldown", w.bird.call === 0);
		const o = B.placeComb(w, 320, 3, true, "red");
		B.applyAction(w, 1, { call: 2, aim: 320 });
		B.step(w);
		check(
			"valid call marks a real target and starts flight",
			w.bird.target === o.id && w.bird.call > 7 && w.bird.state === "flight",
		);
		const old = w.bird.call;
		B.applyAction(w, 1, { call: 2, aim: 320 });
		tick(w, 0.1);
		check(
			"duplicate call counter cannot repeat an ability",
			w.bird.call < old && w.bird.call > 7,
		);
		tick(w, 3);
		check(
			"red harvesting awards its full band value",
			w.stats.redFeeds === 1 && w.score === 1800 && w.obstacles.length === 0,
		);
		const o2 = B.placeComb(w, 420, 2, false, "gone");
		w.bird.target = o2.id;
		w.bird.state = "flight";
		w.obstacles = [];
		B.step(w);
		check(
			"destroyed bird target recovers without a stale reference",
			w.bird.target === 0 && w.bird.state === "recover",
		);
	}
	{
		const w = base();
		w.bird = {
			id: 3,
			x: 320,
			y: 220,
			state: "feed",
			target: 0,
			timer: 1,
			irritation: 0,
			call: 0,
			mark: 0,
			caller: 0,
		};
		for (let i = 0; i < 3; i++) {
			pulse(w, 320, 235);
			B.step(w, 0.05);
		}
		check(
			"repeated friendly spray causes temporary retreat",
			w.bird.state === "retreat" && w.coverage.retreat,
		);
		tick(w, 8);
		check(
			"bird returns reliably",
			w.bird.state !== "retreat" && w.bird.irritation === 0,
		);
	}
	{
		const w = B.createRun({ seats: [1, 2] });
		w.status = "live";
		w.obstacles = [];
		w.pending = [{ at: 500, id: "pending" }];
		const o = B.placeComb(w, 320, 3, false, "call");
		w.bird.call = 0;
		B.applyAction(w, 1, { call: 1, aim: 320 });
		B.applyAction(w, 2, { call: 1, aim: 320 });
		B.step(w);
		check(
			"simultaneous co-op calls resolve in seat order on a shared cooldown",
			w.bird.caller === 1 && w.bird.target === o.id && w.bird.call > 7,
		);
	}
	{
		const w = base(),
			p = w.players[0];
		p.ammo = 1;
		B.applyAction(w, 1, { fire: true });
		B.step(w);
		check(
			"empty can spends exactly one reserve and starts swap",
			p.swap > 0 && w.reserves === 1 && w.stats.spent === 1,
		);
		B.clearActions(w);
		tick(w, 0.7);
		check(
			"automatic swap refills the active can",
			p.ammo === 56 && w.stats.swaps === 1 && w.reserves === 1,
		);
		p.ammo = 0;
		w.reserves = 0;
		tick(w, 1.6);
		check(
			"no reserve gives bounded movement grace then a loss",
			w.result?.won === false && p.grace >= 1.5,
		);
	}
	{
		const w = base();
		w.reserves = 0;
		w.players[0].ammo = 1;
		w.players[0].x = 320;
		w.pending = [];
		bee(w, 320, 6);
		B.applyAction(w, 1, { fire: true });
		tick(w, 0.12);
		check(
			"last pulse clearing last bee beats exhaustion",
			!w.result && w.status === "harvest" && w.players[0].ammo === 56,
		);
		tick(w, 4);
		check(
			"encounter clear refills without granting reserve stock",
			w.status === "intermission" && w.reserves === 0,
		);
	}
	{
		const w = base(),
			p = w.players[0];
		w.score = 19500;
		w.reserves = 0;
		p.ammo = 0;
		p.grace = 1.49;
		const o = B.placeComb(w, 320, 0, false, "replacement");
		w.bird = {
			id: 3,
			x: o.x + 19,
			y: o.y - 4,
			state: "feed",
			target: o.id,
			timer: 0,
			irritation: 0,
			call: 0,
			mark: 0,
			caller: 1,
		};
		B.step(w);
		check(
			"a last harvest can earn its own replacement on the terminal tick",
			!w.result && p.swap > 0 && w.stats.earned === 1 && w.stats.spent === 1,
		);
		B.addScore(w, "jump-score", 150000, 320, 180);
		B.step(w);
		const reserves = w.reserves;
		B.step(w);
		check(
			"multi-threshold score awards each extra can exactly once",
			w.bonusIndex === 4 && w.reserves === reserves,
		);
	}
	{
		const w = base();
		bee(w, 320, 6);
		pulse(w, 320);
		tick(w, 0.1);
		const score = w.score;
		B.enterEncounter(w, 0);
		w.status = "live";
		w.pending = [{ at: 500, id: "later" }];
		w.bees = [];
		w.obstacles = [];
		w.bird.state = "retreat";
		w.bird.timer = 99;
		bee(w, 320, 6);
		pulse(w, 320);
		tick(w, 0.1);
		check(
			"retrying a stable enemy cannot farm its hit reward",
			w.score === score,
		);
		const o = B.placeComb(w, 200, 1, false, "bank", "hive");
		w.pending = [];
		w.bees = [];
		tick(w, 4);
		const earned = w.score;
		B.enterEncounter(w, 0);
		w.status = "live";
		w.pending = [];
		w.bees = [];
		w.obstacles = [];
		B.placeComb(w, 200, 1, false, "bank", "hive");
		tick(w, 4);
		check(
			"hive and clear rewards can be banked only once across retries",
			w.score === earned,
		);
	}
	{
		const w = base(),
			p = w.players[0];
		p.x = 320;
		B.queueGrowth(w, 290, 350, 0.01);
		B.step(w, 0.02);
		check(
			"center flower growth relocates to nearest valid ground",
			p.hop > 0 &&
				p.x === 278 &&
				B.groundIntervals(w).some(([a, b]) => p.x >= a && p.x <= b),
		);
		B.applyAction(w, 1, { aim: 500 });
		tick(w, 1);
		check("cans do not cross a blocking flower interval", p.x <= 278);
		const w2 = base();
		B.queueGrowth(w2, 0, 640, 0.01);
		B.queueGrowth(w2, 0, 640, 0.01);
		const stock = w2.reserves;
		B.step(w2, 0.02);
		check(
			"simultaneous enclosure growth charges one team recovery",
			w2.reserves === stock - 1 &&
				w2.stats.retries === 1 &&
				w2.growth.length === 0,
		);
	}
	{
		const w = base();
		w.pending = [
			{
				id: "delayed",
				at: 2,
				kind: "worker",
				x: 40,
				dir: 1,
				tier: 0,
				reward: "delayed",
			},
		];
		tick(w, 0.5);
		check(
			"pending spawns prevent early encounter completion",
			w.status === "live",
		);
		w.pending = [];
		w.obstacles = [];
		B.placeComb(w, 320, 0, false, "linger");
		tick(w, 4);
		check(
			"unharvested combs cannot prevent a bounded clear",
			w.status === "intermission",
		);
	}
	{
		const w = base();
		B.enterEncounter(w, 4);
		w.status = "live";
		w.bird.state = "retreat";
		w.bird.timer = 7;
		w.pending = [];
		w.bees = [];
		w.obstacles = [];
		tick(w, 6);
		check(
			"boss rescue supply survives all current combs being destroyed",
			w.bees.some((b) => b.kind === "fast") && !w.boss.done,
		);
		const ids = new Set();
		for (let i = 0; i < 14; i++) {
			w.boss.supply = 0;
			B.step(w);
			const b = w.bees.findLast((b) => b.kind === "fast");
			ids.add(b.reward);
			B.addScore(w, b.reward + ":hit", 1000, 320, 100);
			w.bees = [];
		}
		check(
			"renewable escort supply uses a finite number of reward slots",
			ids.size <= 8,
		);
		w.bird.state = "feed";
		const o = B.placeComb(w, 320, 1, true, "shield");
		w.bird.target = o.id;
		w.bird.timer = 0;
		B.step(w);
		check(
			"red feed exposes boss shield through ordinary bird state",
			w.boss.open > 0,
		);
	}
	{
		const w = base();
		B.setTuning(w, { ...B.defaults(), capacity: 20, beeSpeed: 77 });
		check(
			"live tuning clamps current ammo and marks assistance",
			w.players[0].ammo === 20 && w.assisted && w.tuning.beeSpeed === 77,
		);
		let bad = false;
		try {
			B.validateTuning({ capacity: Infinity });
		} catch {
			bad = true;
		}
		check("invalid tuning is rejected", bad);
		let malformed = false;
		try {
			B.validateContent([{ id: "broken" }]);
		} catch {
			malformed = true;
		}
		check("invalid authored content is rejected", malformed);
		const content = JSON.parse(JSON.stringify(B.CONTENT));
		content[0].entries.push({
			id: "designer-added",
			at: 91,
			kind: "worker",
			x: 110,
			tier: 2,
			dir: 1,
		});
		const extended = B.createRun({ content });
		check(
			"new data-authored wave needs no simulation changes",
			extended.pending.some((p) => p.id === "designer-added"),
		);
	}
	{
		const run = () => {
			const w = B.createRun({ seed: 17 });
			for (let i = 0; i < 120 * 20; i++) {
				if (i % 12 === 0) B.applyAction(w, 1, B.pilot(w));
				B.step(w);
			}
			return JSON.stringify(B.snapshot(w));
		};
		check(
			"same seed and ordinary actions produce identical authoritative state",
			run() === run(),
		);
		const w = base();
		B.removeSeat(w, 1);
		check("last player departure finishes cleanly", !!w.result);
	}
	{
		const msg = {
			v: 1,
			k: "input",
			seq: 5,
			move: 9,
			aim: -200,
			fire: true,
			call: 1,
		};
		const a = B.validateActionMessage(msg, 4);
		check(
			"network input clamps geometry and authenticates independent of seat claim",
			a.move === 1 && a.aim === 28,
		);
		check(
			"stale network input is rejected",
			B.validateActionMessage(msg, 5) === null,
		);
		check(
			"malformed network input is rejected",
			B.validateActionMessage({ ...msg, move: NaN }, 4) === null,
		);
		const w = B.createRun({ seats: [1, 2] });
		for (let i = 0; i < 120 * 15; i++) {
			if (i % 12 === 0)
				for (const p of w.players) B.applyAction(w, p.seat, B.pilot(w, p.seat));
			B.step(w);
		}
		const data = B.pack(w),
			round = B.unpack(data);
		check(
			"packed snapshots preserve all world entities and resources",
			round.bees.length === w.bees.length &&
				round.obstacles.length === w.obstacles.length &&
				round.score === w.score &&
				round.players.length === 2,
		);
		check(
			"complete normal snapshots stay within 16 KB",
			JSON.stringify({ v: 1, k: "state", seq: 1, state: data }).length < 16000,
		);
	}
	for (const seats of [[1], [1, 2]]) {
		const w = B.createRun({ seed: 7, seats }),
			order = [];
		let stage = -1,
			maxBytes = 0;
		for (let i = 0; i < 120 * 1000 && !w.result; i++) {
			if (i % 12 === 0)
				for (const p of w.players) B.applyAction(w, p.seat, B.pilot(w, p.seat));
			B.step(w);
			if (w.stage !== stage) {
				stage = w.stage;
				order.push(stage + 1);
			}
			if (i % 120 === 0)
				maxBytes = Math.max(maxBytes, JSON.stringify(B.pack(w)).length);
		}
		check(
			"ordinary-input " + seats.length + "-player campaign reaches the ending",
			w.result?.won === true,
		);
		check(
			seats.length + "-player encounter order and full mechanic coverage",
			order.join(",") === "1,2,3,4,5,6" &&
				[
					"moveFire",
					"convert",
					"call",
					"harvest",
					"fast",
					"redHarvest",
					"hive",
					"clearComb",
					"pollination",
					"shield",
				].every((k) => w.coverage[k]),
		);
		check(
			seats.length + "-player stock accounting balances exactly",
			w.reserves ===
				(seats.length === 1 ? 2 : 3) + w.stats.earned - w.stats.spent,
		);
		check(
			seats.length + "-player completed all four shield buds and six gardens",
			w.stats.shieldBreaks === 4 && w.stats.cleared === 6,
		);
		check(
			seats.length +
				"-player full-run values remain finite and payloads bounded",
			Number.isFinite(w.score) &&
				Number.isFinite(w.time) &&
				w.players.every((p) => Number.isFinite(p.x) && p.ammo >= 0) &&
				maxBytes < 16000,
		);
		writeFileSync(
			new URL("evidence/playthrough-" + seats.length + "p.json", dir),
			JSON.stringify(
				{
					won: w.result?.won,
					time: w.time,
					score: w.score,
					reserves: w.reserves,
					stats: w.stats,
					coverage: w.coverage,
					order,
					maxBytes,
					assisted: w.assisted,
				},
				null,
				2,
			),
		);
	}
	{
		const w = base();
		B.applyAction(w, 1, { fire: true });
		tick(w, 70);
		check(
			"wasting normal spray causes an ordinary loss",
			w.result?.won === false && w.stats.spent === 2,
		);
		const fresh = B.createRun({ seed: 11 });
		check(
			"fresh run after loss resets claims stock and score",
			fresh.score === 0 && fresh.reserves === 2 && !fresh.result,
		);
	}
	const ctx = load(true);
	for (const f of ["rigs", "audio", "presentation", "input", "screens", "main"])
		vm.runInContext(
			readFileSync(new URL("src/" + f + ".js", dir), "utf8"),
			ctx,
			{ filename: f },
		);
	const game = ctx.__game;
	game.advance(0.5);
	check(
		"native engine headless title draws without errors",
		game.sceneName === "title" && game.errors.length === 0,
	);
	game.input.tap("confirm");
	game.advance(4);
	check(
		"native title action starts real gameplay",
		game.sceneName === "play" && ctx.__BUZZ.world.status === "live",
	);
	const before = JSON.stringify(ctx.BCP.snapshot(ctx.__BUZZ.world));
	game.pause("player");
	game.advance(2);
	check(
		"standalone pause freezes authoritative timers and ammo",
		before === JSON.stringify(ctx.BCP.snapshot(ctx.__BUZZ.world)),
	);
	game.resume();
	game.advance(0.5);
	check(
		"native gameplay rendering and resume are error-free",
		game.errors.length === 0,
	);
	game.dispose();
}
