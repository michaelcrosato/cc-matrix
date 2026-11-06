import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { DEFAULT_TUNING, STAGES } from "../content/stages.js";
import {
	Authority,
	pack,
	unpack,
	validateInput,
	validSnapshot,
} from "../src/net/protocol.js";
import { Garden } from "../src/presentation/garden.js";
import { pilot } from "../src/sim/bot.js";
import {
	blocked,
	clone,
	distance,
	enterStage,
	footprint,
	invariants,
	leave,
	newWorld,
	retry,
	STEP,
	spawnRival,
	step,
	topology,
	tune,
	validateStages,
} from "../src/sim/world.js";
export async function simulation(check) {
	const run = (s, seconds, commands = []) => {
		for (let i = 0; i < Math.round(seconds * 120); i++)
			step(s, typeof commands === "function" ? commands(s) : commands);
	};
	const quiet = (players = 1, stage = 0) => {
		const s = newWorld({ players, stage });
		s.queue = [{ at: 1e9, type: "left", entrance: 0 }];
		s.nextRival = 1e9;
		s.players.forEach((p) => {
			p.inv = 0;
		});
		return s;
	};
	const target = (id = 100, x = 192, y = 120, hp = 1.65, type = "left") => ({
		id,
		type,
		x,
		y,
		hp,
		maxHp: hp,
		r: 7,
		dir: 0,
		turn: -1,
		lastContact: -100,
		contrib: [0, 0],
		warning: 0,
		stuck: 0,
		think: 100,
		recovering: false,
		bossPhase: "move",
		bossT: 0,
		circuit: 0,
	});
	const rival = (id = 300, x = 192, y = 120, age = 0) => ({
		id,
		x,
		y,
		r: 8,
		dir: 0,
		age,
		state: 0,
		warning: 0,
		turn: 100,
		want: 0,
		matureAt: -10,
	});
	check(
		"six valid authored encounters",
		STAGES.length === 6 && validateStages().length === 0,
	);
	for (const [i, d] of STAGES.entries()) {
		check(
			`encounter ${i + 1}: connected Focus routes`,
			topology({ stage: i, husks: [] }),
		);
		check(
			`encounter ${i + 1}: schedules finish`,
			d.schedule.length >= 7 &&
				d.schedule.at(-1).at <= 110 &&
				d.rivals.cap <= 5,
		);
	}
	let bad = clone(STAGES);
	bad[0].obstacles = [{ x: 0, y: 0, w: 384, h: 240 }];
	check(
		"validator rejects fully blocked floor",
		validateStages(bad).some((e) => e.includes("disconnected")),
	);
	bad = clone(STAGES);
	bad[0].schedule[0].type = "dragon";
	check(
		"validator rejects unsupported archetypes",
		validateStages(bad).some((e) => e.includes("schedule")),
	);
	bad = clone(STAGES);
	bad[5].schedule = bad[5].schedule.filter((e) => e.type !== "bell");
	check(
		"validator rejects unreachable final condition",
		validateStages(bad).some((e) => e.includes("concluding")),
	);
	const a = newWorld({ seed: 77 }),
		b = newWorld({ seed: 77 });
	for (let i = 0; i < 2400; i++) {
		const c = [
			{
				x: Math.sin(i / 110),
				y: Math.cos(i / 140),
				focus: i % 160 < 40,
				ray: Math.floor(i / 300),
			},
		];
		step(a, c);
		step(b, c);
	}
	check(
		"seeded simulation is reproducible",
		JSON.stringify(a) === JSON.stringify(b),
	);
	const restored = clone(a);
	run(a, 2, [{ x: 0.3, y: -0.2, focus: false, ray: 8 }]);
	run(restored, 2, [{ x: 0.3, y: -0.2, focus: false, ray: 8 }]);
	check(
		"snapshot restore continues identically",
		JSON.stringify(a) === JSON.stringify(restored),
	);
	let s = quiet(),
		p = s.players[0];
	p.x = 180;
	p.y = 120;
	run(s, 0.25, [{ x: 1, y: 1, focus: false, ray: 0 }]);
	check(
		"diagonal flight is normalized",
		Math.abs(distance(p, { x: 180, y: 120 }) - 86 * 0.25) < 0.001,
	);
	const roam = quiet(),
		focus = quiet();
	run(roam, 0.25, [{ x: 1, y: 0 }]);
	run(focus, 0.25, [{ x: 1, y: 0, focus: true }]);
	check(
		"Focus has a real speed tradeoff",
		Math.abs((focus.players[0].x - 176) / (roam.players[0].x - 176) - 0.75) <
			0.001,
	);
	check(
		"formation footprint follows bee count and Focus",
		footprint({ bees: 12, focus: false }) >
			footprint({ bees: 4, focus: false }) &&
			footprint({ bees: 12, focus: false }) >
				footprint({ bees: 12, focus: true }),
	);
	s = quiet();
	p = s.players[0];
	p.x = 192;
	s.targets = [target()];
	run(s, 0.1);
	const wounded = s.targets[0].hp;
	check(
		"only sustained valid overlap stings",
		wounded < 1.65 && s.stats.contactTicks > 0,
	);
	p.x = 50;
	p.y = 200;
	run(s, 0.6);
	check(
		"recovery has a contact-break grace",
		Math.abs(s.targets[0].hp - wounded) < 0.0001,
	);
	run(s, 0.6);
	check(
		"broken contact visibly recovers target",
		s.targets[0].hp > wounded && s.targets[0].recovering,
	);
	run(s, 5);
	check(
		"full recovery clears old contributors",
		s.targets[0].hp === s.targets[0].maxHp &&
			s.targets[0].contrib.every((n) => n === 0),
	);
	s = quiet(2);
	p = s.players[0];
	p.x = 192;
	p.y = 120;
	s.players[1].x = 300;
	s.players[1].y = 120;
	s.targets = [target(100, 50, 40)];
	s.husks = [{ id: 101, x: 240, y: 120, r: 9 }];
	s.rivals = [rival(300, 60, 120), rival(301, 192, 120), rival(302, 320, 180)];
	step(s, [{ ray: 1 }]);
	check(
		"horizontal ray hits both sides and touching rivals",
		s.rivals.length === 1 && s.rivals[0].id === 302 && s.stats.zaps === 2,
	);
	check(
		"ray spares gardeners, shells and friendly bees",
		s.targets[0].hp === 1.65 &&
			s.husks.length === 1 &&
			s.players.every((p) => p.bees === 12),
	);
	check("ray spends one nonstacking charge", p.charge === 0);
	step(s, [{ ray: 2 }]);
	check(
		"empty ray gives dry cue without movement lock",
		s.stats.rays === 1 && s.events.some((e) => e.type === "dry"),
	);
	s = quiet();
	p = s.players[0];
	p.x = 192;
	s.targets = [target(100, 192, 120, 0.001)];
	step(s, [{ ray: 1 }]);
	check(
		"same-tick spend occurs before kill refill",
		p.charge === 1 && s.stats.refills === 1 && s.stats.rays === 1,
	);
	const score = s.score;
	run(s, 0.1);
	check(
		"target death owns one score and one shell event",
		s.score === score &&
			s.husks.length === 1 &&
			s.events.filter((e) => e.type === "collapse").length === 1,
	);
	check(
		"kill shell ejects friendly centroid to legal space",
		!blocked(s, p.x, p.y, footprint(p)),
	);
	s = quiet(2);
	s.players.forEach((p) => {
		p.charge = 0;
		p.x = 192;
		p.y = 120;
	});
	let t = target(100, 192, 120, 0.001);
	t.contrib = [2, 4];
	s.targets = [t];
	step(s, []);
	check(
		"co-op refill honors greatest empty contributor",
		s.players[1].charge === 1 && s.players[0].charge === 0,
	);
	s = quiet(2);
	s.players.forEach((p) => {
		p.charge = 0;
		p.x = 300;
		p.y = 200;
	});
	s.players[0].emptyAt = 3;
	s.players[1].emptyAt = 1;
	s.targets = [target(100, 192, 120, 0)];
	step(s, []);
	check(
		"co-op fallback honors longest-empty living player",
		s.players[1].charge === 1 && s.players[0].charge === 0,
	);
	s = quiet(2);
	s.players.forEach((p) => {
		p.charge = 0;
		p.x = 192;
		p.y = 120;
	});
	s.targets = [target(100, 192, 120, 0.001), target(101, 193, 120, 0.001)];
	step(s, []);
	check(
		"simultaneous co-op kills award two distinct refills",
		s.players.every((p) => p.charge === 1) &&
			s.stats.refills === 2 &&
			s.stats.kills === 2,
	);
	s = quiet();
	p = s.players[0];
	s.rivals = Array.from({ length: 5 }, (_, i) => rival(300 + i, p.x, p.y));
	for (let i = 0; i < 120; i++) {
		s.rivals.forEach((a) => {
			a.x = p.x;
			a.y = p.y;
		});
		step(s, []);
	}
	check(
		"overlapping threats respect one-bee damage cadence",
		p.bees === 10 && s.stats.losses === 2,
	);
	check(
		"damage has a visible one-shot event",
		s.events.filter((e) => e.type === "loss").length === 2,
	);
	s = quiet();
	s.rivals = [rival(300, 350, 200, 14.99)];
	step(s);
	check("scout matures into guard", s.rivals[0].state === 0);
	run(s, 0.1);
	check(
		"guard has explicit maturation event",
		s.rivals[0].state === 1 && s.events.some((e) => e.type === "mature"),
	);
	s.rivals[0].age = 31;
	run(s, 0.1);
	check("guard becomes pursuing hunter", s.rivals[0].state === 2);
	s = quiet();
	check(
		"entrance warning is never zero",
		spawnRival(s) &&
			s.rivals[0].warning >= 0.7 &&
			s.players.every((p) => distance(p, s.rivals[0]) >= 40),
	);
	for (let i = 0; i < 6; i++) {
		s = quiet(1, i);
		for (let j = 0; j < 8; j++) {
			const x = 30 + (j % 4) * 90,
				y = 30 + Math.floor(j / 4) * 180;
			s.targets = [target(100 + j, x, y, 0)];
			step(s, []);
		}
		check(
			`encounter ${i + 1}: shells preserve reachable topology`,
			topology(s) && s.husks.length === 8,
		);
	}
	s = quiet(1, 3);
	p = s.players[0];
	p.x = 96;
	p.y = 119;
	run(s, 0.8, [{ x: 1, y: 0, focus: false }]);
	const roamX = p.x;
	s = quiet(1, 3);
	p = s.players[0];
	p.x = 96;
	p.y = 119;
	run(s, 0.8, [{ x: 1, y: 0, focus: true }]);
	check(
		"authored gap admits Focus and rejects broad Roam",
		roamX < 116 && p.x > 134,
	);
	s = quiet(2);
	s.players[0].bees = 0;
	run(s, 0.2);
	check(
		"one fallen co-op swarm observes while team continues",
		s.phase === "play" && s.players[1].bees === 12,
	);
	s.queue = [];
	step(s);
	run(s, 4.1);
	check(
		"checkpoint clear replenishes fallen teammate",
		s.stage === 1 && s.players.every((p) => p.bees === 12),
	);
	s = quiet(2);
	s.players.forEach((p) => {
		p.bees = 0;
	});
	step(s);
	check(
		"complete co-op wipe fails once",
		s.phase === "failed" &&
			s.events.filter((e) => e.type === "defeat").length === 1,
	);
	s.checkpoint = { score: 720, streak: 2 };
	s.score = 900;
	retry(s);
	check(
		"retry restores playable assisted checkpoint",
		s.phase === "play" &&
			s.score === 720 &&
			s.streak === 2 &&
			s.assisted &&
			s.players.every((p) => p.bees === 12),
	);
	tune(s, "speed", 999);
	check(
		"live tuning clamps and remembers assisted history",
		s.tuning.speed === 135 && s.assisted,
	);
	tune(s, "speed", 86);
	check("resetting defaults cannot clean assisted history", s.assisted);
	check("invalid tuning is rejected", !tune(s, "speed", NaN));
	leave(s, 1);
	check(
		"departed player is neutralized",
		!s.players[1].joined && s.players[1].bees === 0,
	);
	s = quiet(1, 5);
	s.queue = [{ at: 0, type: "bell", entrance: 0 }];
	step(s);
	run(s, 1.4);
	check(
		"concluding gardener exposes a clear core",
		s.targets[0]?.bossPhase === "open" && s.stats.bossExposures > 0,
	);
	t = s.targets[0];
	t.bossPhase = "pulse";
	t.bossT = 1.49;
	p = s.players[0];
	p.x = t.x + 30;
	p.y = t.y;
	const oldX = p.x;
	step(s);
	step(s);
	check(
		"telegraphed bell pulse pushes without bee damage",
		p.bees === 12 && p.x > oldX && s.stats.bossPulses === 1,
	);
	const packet = pack(s),
		copy = unpack(packet);
	check(
		"compact snapshots preserve campaign and player state",
		validSnapshot(packet) &&
			copy.stage === s.stage &&
			copy.players[0].bees === 12 &&
			copy.targets[0].bossPhase === s.targets[0].bossPhase,
	);
	const record = { seq: -1, ray: 0 };
	const input = {
		t: "i",
		v: 1,
		seq: 1,
		stage: 0,
		x: 0.5,
		y: 0,
		focus: false,
		ray: 1,
	};
	check(
		"network accepts finite owned intention",
		!!validateInput(input, record, 0),
	);
	check(
		"network rejects forged score/coordinates as commands",
		!validateInput({ ...input, x: Infinity }, record, 0) &&
			!validateInput({ ...input, ray: 100 }, record, 0),
	);
	check(
		"network rejects stale phase and sequence",
		!validateInput({ ...input, stage: 1 }, record, 0) &&
			!validateInput(input, { seq: 1, ray: 1 }, 0),
	);
	s = quiet(2);
	const wire = [],
		authority = new Authority({
			host: true,
			local: 0,
			send: (m, o) => wire.push({ m, o }),
			onSnapshot: () => {},
		});
	authority.receive(input, 1, 1, s);
	run(s, 0.1, authority.commands(s, { x: 0, y: 0, ray: 0 }, 1.1));
	check(
		"guest intention moves its own authoritative seat",
		s.players[1].x > 208 && s.players[0].x === 176,
	);
	check(
		"lost release is bounded by stale-input timeout",
		authority.commands(s, {}, 1.6)[1].x === 0 &&
			authority.commands(s, {}, 1.6)[1].focus === false,
	);
	for (let i = 0; i < 1200; i++) authority.update(s, {}, i / 120);
	check(
		"host traffic stays under official rate budget",
		authority.metrics.maxRate <= 13 &&
			authority.metrics.maxBytes < 16384 &&
			authority.metrics.unreliableMax <= 1200,
	);
	const worstState = quiet(2, 5);
	worstState.time = 110.5;
	worstState.targets = Array.from({ length: 4 }, (_, i) =>
		target(100 + i, 80 + i * 64, 60, 1.234),
	);
	worstState.rivals = Array.from({ length: 6 }, (_, i) => ({
		...rival(300 + i, 40 + i * 50, 180, 22.34),
		state: 2,
	}));
	worstState.husks = Array.from({ length: 10 }, (_, i) => ({
		id: 500 + i,
		x: 20 + i * 34.36,
		y: 220.7,
		r: 10.5,
		type: "right",
		born: 12.3 + i * 7,
	}));
	worstState.events = Array.from({ length: 8 }, (_, i) => ({
		id: 700 + i,
		type: "collapse",
		t: 109.432 + i / 30,
		x: 129.3 + i * 11,
		y: 178.7,
		points: 325,
		kind: "right",
	}));
	const worstWire = [],
		worstAuthority = new Authority({
			host: true,
			local: 0,
			send: (data, opts) => worstWire.push(opts),
			onSnapshot: () => {},
		});
	worstAuthority.update(worstState, {}, 1);
	check(
		"worst authored full snapshot chooses reliable delivery when necessary",
		worstAuthority.metrics.maxBytes > 1180 &&
			worstAuthority.metrics.maxBytes < 16384 &&
			worstWire[0].reliable &&
			worstAuthority.metrics.reliableSnapshots === 1,
		JSON.stringify(worstAuthority.metrics),
	);
	const sink = new Authority({
		host: false,
		local: 1,
		send: () => {},
		onSnapshot: () => {},
	});
	for (let i = 0; i < 1200; i++)
		sink.update(s, { x: 0, y: 0, focus: false, ray: 1 }, i / 120);
	check(
		"guest traffic stays under official rate budget",
		sink.metrics.maxRate <= 16,
	);
	// Principal completion proof: only ordinary movement/Focus/ray commands. No cheats, teleports or health edits.
	const campaign = newWorld({ players: 2, seed: 4117 }),
		mem = [{}, {}];
	let worst = 0,
		unreachable = false,
		healthIssue = false,
		finalCheckpoint = null,
		hunterSeen = false;
	const campaignStates = new Set();
	for (let i = 0; i < 120 * 800; i++) {
		const commands = campaign.players.map((p, j) => pilot(campaign, p, mem[j]));
		if (!hunterSeen)
			commands.forEach((c, j) => {
				c.ray = campaign.players[j].lastRay;
			});
		if (
			campaign.stage === 5 &&
			campaign.phase === "play" &&
			campaign.targets.length === 1 &&
			!campaign.queue.length &&
			campaign.targets[0].hp < 0.08
		)
			finalCheckpoint = { world: clone(campaign), commands: clone(commands) };
		step(campaign, commands);
		for (const a of campaign.rivals)
			if (a.warning <= 0) {
				campaignStates.add(a.state);
				if (a.state === 2) hunterSeen = true;
			}
		if (i % 120 === 0) {
			worst = Math.max(
				worst,
				new TextEncoder().encode(JSON.stringify(pack(campaign))).length,
			);
			if (invariants(campaign).length) healthIssue = true;
		}
		if (campaign.phase === "failed" || campaign.phase === "ending") break;
	}
	check(
		"normal-command pilot completes all six encounters",
		campaign.phase === "ending" && campaign.stats.clears === 6,
		`phase=${campaign.phase}, stage=${campaign.stage + 1}, t=${campaign.time}`,
	);
	check(
		"campaign pacing leaves headroom below Hub cap",
		campaign.time >= 600 && campaign.time <= 720,
		`${campaign.time.toFixed(2)} s`,
	);
	check(
		"campaign proof used no assisted or invulnerable state",
		!campaign.assisted && !campaign.dev.invulnerable,
	);
	check(
		"campaign proof exercised Focus, sting, recovery and bee loss",
		campaign.stats.focusTicks > 0 &&
			campaign.stats.contactTicks > 0 &&
			campaign.stats.recoveries > 0 &&
			campaign.stats.losses > 0,
	);
	check(
		"principal campaign actually encounters scouts, guards and hunters",
		[0, 1, 2].every((n) => campaignStates.has(n)),
	);
	check(
		"campaign proof exercised rays, maturation and concluding pulse",
		campaign.stats.rays > 0 &&
			campaign.stats.zaps > 0 &&
			campaign.stats.maturations > 0 &&
			campaign.stats.bossExposures > 0 &&
			campaign.stats.bossPulses > 0,
	);
	check(
		"worst authored snapshot fits tested reliable strategy",
		worst < 16384 && worst > 0,
		`${worst} bytes`,
	);
	check("whole campaign state remains finite and bounded", !healthIssue);
	writeFileSync(
		new URL("../evidence/campaign.json", import.meta.url),
		JSON.stringify(
			{
				phase: campaign.phase,
				seconds: campaign.time,
				score: campaign.score,
				bees: campaign.players.map((p) => p.bees),
				stats: campaign.stats,
				cleared: campaign.cleared,
				maxSnapshotBytes: worst,
				assisted: campaign.assisted,
				rivalStates: [...campaignStates],
			},
			null,
			2,
		) + "\n",
	);
	if (finalCheckpoint)
		writeFileSync(
			new URL("../evidence/final-checkpoint.json", import.meta.url),
			JSON.stringify(finalCheckpoint) + "\n",
		);
	const solo = newWorld({ seed: 4117 }),
		soloMemory = {};
	const soloStates = new Set();
	for (let i = 0; i < 120 * 800; i++) {
		step(solo, [pilot(solo, solo.players[0], soloMemory)]);
		for (const a of solo.rivals) if (a.warning <= 0) soloStates.add(a.state);
		if (solo.phase === "failed" || solo.phase === "ending") break;
	}
	check(
		"normal solo pilot completes all six without assistance",
		solo.phase === "ending" &&
			solo.stats.clears === 6 &&
			!solo.assisted &&
			!solo.dev.invulnerable,
		JSON.stringify({ phase: solo.phase, stage: solo.stage, time: solo.time }),
	);
	check(
		"normal solo run fits the ten-to-twelve minute campaign",
		solo.time >= 600 && solo.time <= 720,
		solo.time.toFixed(2),
	);
	writeFileSync(
		new URL("../evidence/solo-campaign.json", import.meta.url),
		JSON.stringify(
			{
				phase: solo.phase,
				seconds: solo.time,
				score: solo.score,
				bees: solo.players.map((p) => p.bees),
				stats: solo.stats,
				rivalStates: [...soloStates],
				assisted: solo.assisted,
			},
			null,
			2,
		) + "\n",
	);
	const logs = [],
		ctx = {
			console: {
				log: () => {},
				warn: (...a) => logs.push(a.join(" ")),
				error: (...a) => logs.push(a.join(" ")),
			},
			performance,
			TextEncoder,
		};
	vm.createContext(ctx);
	vm.runInContext(
		readFileSync(
			new URL("../vendor/engine/my-3d2dge.js", import.meta.url),
			"utf8",
		),
		ctx,
	);
	const E = ctx.My3D2dge,
		game = new E.Game({
			headless: true,
			draw: true,
			res: [480, 320],
			view: "overhead",
			input: { ...E.Input.SHMUP, focus: ["ShiftLeft"] },
		}),
		nativeWorld = newWorld(),
		garden = new Garden(E, game);
	game.start({
		update(dt) {
			const m = game.input.move();
			step(
				nativeWorld,
				[
					{
						x: m[0],
						y: m[1],
						focus: game.input.down("focus"),
						ray: game.input.down("fire") ? 1 : 0,
					},
				],
				dt,
			);
			garden.update(dt, nativeWorld);
		},
		draw(r) {
			garden.draw(r, nativeWorld);
		},
		boot: false,
	});
	game.input.hold("right");
	game.advance(0.25);
	game.input.hold("right", false);
	game.input.tap("fire");
	game.advance(0.1);
	check(
		"native fixed-step headless input drives actual simulation",
		nativeWorld.players[0].x > 190 && nativeWorld.stats.rays === 1,
	);
	check(
		"native renderer draws same rigs without collected errors",
		game.errors.length === 0,
		JSON.stringify(game.errors),
	);
	game.dispose();
}
