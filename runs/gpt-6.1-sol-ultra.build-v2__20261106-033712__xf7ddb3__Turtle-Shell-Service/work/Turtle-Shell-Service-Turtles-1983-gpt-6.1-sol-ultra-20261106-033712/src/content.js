/* Turtle Shell Service — authored hotel floors. Original game content, MIT. */
(() => {
	"use strict";
	const T = (globalThis.TSS = globalThis.TSS || {});
	const TILE = 16,
		DIRS = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		];
	const DEFAULT_BALANCE = Object.freeze({
		playerSpeed: 3.5,
		carryingMultiplier: 0.9,
		beetleSpeed: 1,
		yellowAge: 18,
		redAge: 42,
		stunDuration: 3,
		bombLifetime: 6,
		supplyRecharge: 6,
	});
	const BALANCE_LIMITS = Object.freeze({
		playerSpeed: [2.5, 5.5, 0.1],
		carryingMultiplier: [0.65, 1, 0.01],
		beetleSpeed: [0.5, 1.4, 0.05],
		yellowAge: [8, 40, 1],
		redAge: [20, 75, 1],
		stunDuration: [1, 6, 0.25],
		bombLifetime: [2, 12, 0.5],
		supplyRecharge: [2, 15, 0.5],
	});
	function rowsFrom(routes) {
		const a = Array.from({ length: 13 }, () => Array(21).fill("#"));
		for (const route of routes)
			for (let i = 1; i < route.length; i++) {
				let [x, y] = route[i - 1];
				const [tx, ty] = route[i];
				const dx = Math.sign(tx - x),
					dy = Math.sign(ty - y);
				if (dx && dy) throw Error("Authored corridor must be cardinal");
				a[y][x] = ".";
				while (x !== tx || y !== ty) {
					x += dx;
					y += dy;
					a[y][x] = ".";
				}
			}
		return a.map((r) => r.join(""));
	}
	const ring = [
		[1, 1],
		[19, 1],
		[19, 11],
		[1, 11],
		[1, 1],
	];
	const layouts = [
		rowsFrom([
			ring,
			[
				[1, 5],
				[19, 5],
			],
			[
				[1, 7],
				[19, 7],
			],
			[
				[5, 1],
				[5, 11],
			],
			[
				[15, 1],
				[15, 11],
			],
			[
				[5, 3],
				[15, 3],
			],
			[
				[5, 9],
				[15, 9],
			],
			[
				[10, 5],
				[10, 11],
			],
		]),
		rowsFrom([
			ring,
			[
				[1, 3],
				[9, 3],
				[9, 9],
				[1, 9],
			],
			[
				[11, 3],
				[19, 3],
			],
			[
				[11, 9],
				[19, 9],
			],
			[
				[5, 1],
				[5, 11],
			],
			[
				[15, 1],
				[15, 11],
			],
			[
				[1, 6],
				[19, 6],
			],
			[
				[11, 3],
				[11, 9],
			],
			[
				[9, 9],
				[11, 9],
			],
		]),
		rowsFrom([
			ring,
			[
				[3, 1],
				[3, 7],
				[9, 7],
				[9, 11],
			],
			[
				[1, 9],
				[15, 9],
				[15, 1],
			],
			[
				[7, 1],
				[7, 5],
				[19, 5],
			],
			[
				[7, 3],
				[15, 3],
			],
			[
				[11, 3],
				[11, 9],
			],
			[
				[15, 7],
				[19, 7],
			],
		]),
		rowsFrom([
			ring,
			[
				[1, 4],
				[19, 4],
			],
			[
				[1, 8],
				[19, 8],
			],
			[
				[5, 1],
				[5, 11],
			],
			[
				[10, 1],
				[10, 11],
			],
			[
				[15, 1],
				[15, 11],
			],
			[
				[5, 6],
				[15, 6],
			],
		]),
	];
	const homes = [
		[1, 1],
		[19, 1],
		[1, 11],
		[19, 11],
	];
	function floor(
		id,
		name,
		subtitle,
		layout,
		quota,
		rooms,
		beetles,
		supply,
		palette,
		decorations,
		tutorial,
	) {
		return Object.freeze({
			id,
			name,
			subtitle,
			rows: layouts[layout],
			quota,
			rooms,
			beetles,
			supply,
			homes,
			spawns: [
				[19, 11],
				[19, 10],
			],
			palette,
			decorations,
			tutorial,
			layout,
		});
	}
	const FLOORS = [
		floor(
			"lobby",
			"The Grand Lobby",
			"Little guests. Big responsibility.",
			0,
			4,
			[
				[15, 11],
				[5, 3],
				[17, 5],
				[3, 1],
			],
			[{ cell: [10, 3], age: 0 }],
			[10, 7],
			{
				bg: "#101c27",
				floor: "#25383d",
				floor2: "#2b4143",
				wall: "#50665a",
				top: "#8b9b76",
				trim: "#e2b968",
				accent: "#f5d58c",
				plant: "#4b9d66",
			},
			[
				{ kind: "bell", cell: [10, 1] },
				{ kind: "plant", cell: [3, 3] },
				{ kind: "luggage", cell: [17, 9] },
				{ kind: "plant", cell: [7, 7] },
			],
			[
				"Visit a ? room. A little guest needs a lift!",
				"Carry one hatchling to its matching lit home.",
				"Drop a bug bomb. One trap for the whole team.",
				"The brass bell in the middle refills two bombs.",
			],
		),
		floor(
			"laundry",
			"Laundry & Lost Socks",
			"Break the line. Keep the passenger.",
			1,
			5,
			[
				[15, 11],
				[3, 3],
				[7, 9],
				[17, 3],
				[11, 7],
				[3, 1],
			],
			[
				{ cell: [5, 3], age: 14 },
				{ cell: [15, 6], age: 0 },
			],
			[10, 6],
			{
				bg: "#101f32",
				floor: "#26364c",
				floor2: "#2e4056",
				wall: "#426788",
				top: "#789bb1",
				trim: "#d8c391",
				accent: "#91dddf",
				plant: "#62ae9a",
			},
			[
				{ kind: "laundry", cell: [7, 5] },
				{ kind: "laundry", cell: [17, 8] },
				{ kind: "luggage", cell: [3, 7] },
				{ kind: "plant", cell: [13, 3] },
			],
			[
				"Yellow beetles spot you along a straight corridor.",
				"Turn a corner, then leave a bomb in their path.",
			],
		),
		floor(
			"garden",
			"Glasshouse Gallery",
			"They can turn corners now. You can improvise.",
			2,
			5,
			[
				[17, 11],
				[3, 5],
				[7, 3],
				[13, 5],
				[15, 7],
				[5, 1],
				[9, 9],
			],
			[
				{ cell: [3, 3], age: 39 },
				{ cell: [11, 7], age: 15 },
				{ cell: [15, 3], age: 0 },
			],
			[11, 5],
			{
				bg: "#102b2c",
				floor: "#243f3c",
				floor2: "#2c4941",
				wall: "#4e7565",
				top: "#8eab7f",
				trim: "#e9c184",
				accent: "#c5df91",
				plant: "#62b378",
			},
			[
				{ kind: "fountain", cell: [5, 7] },
				{ kind: "plant", cell: [9, 3] },
				{ kind: "plant", cell: [13, 7] },
				{ kind: "plant", cell: [17, 9] },
			],
			[
				"Red beetles follow routes around corners.",
				"A stunned beetle recovers as a wandering blue.",
			],
		),
		floor(
			"suites",
			"The Pillow Suites",
			"Two shells make excellent room service.",
			3,
			6,
			[
				[15, 11],
				[5, 10],
				[3, 4],
				[7, 1],
				[13, 4],
				[17, 8],
				[10, 2],
				[17, 1],
			],
			[
				{ cell: [5, 4], age: 32 },
				{ cell: [10, 8], age: 16 },
				{ cell: [15, 4], age: 3 },
			],
			[10, 6],
			{
				bg: "#221d34",
				floor: "#3b324b",
				floor2: "#473b55",
				wall: "#766075",
				top: "#b99b9b",
				trim: "#e2ba79",
				accent: "#efb2c0",
				plant: "#7f9c87",
			},
			[
				{ kind: "luggage", cell: [3, 6] },
				{ kind: "pillow", cell: [7, 8] },
				{ kind: "pillow", cell: [17, 4] },
				{ kind: "plant", cell: [13, 10] },
			],
			[
				"Split up to scout. Passengers reserve different homes.",
				"There is always another way around the ring.",
			],
		),
		floor(
			"roof",
			"Rooftop Rendezvous",
			"One last round. Everybody gets home.",
			2,
			6,
			[
				[15, 11],
				[3, 7],
				[7, 5],
				[11, 3],
				[17, 5],
				[5, 1],
				[13, 9],
				[17, 1],
			],
			[
				{ cell: [3, 3], age: 37 },
				{ cell: [11, 7], age: 24 },
				{ cell: [15, 3], age: 12 },
				{ cell: [7, 1], age: 0 },
			],
			[11, 5],
			{
				bg: "#17223e",
				floor: "#334253",
				floor2: "#3d4e5c",
				wall: "#667477",
				top: "#acaf91",
				trim: "#f0c982",
				accent: "#ffcba1",
				plant: "#7cbd8a",
			},
			[
				{ kind: "balloon", cell: [5, 7] },
				{ kind: "plant", cell: [9, 3] },
				{ kind: "balloon", cell: [13, 7] },
				{ kind: "plant", cell: [17, 9] },
			],
			[
				"The roof is open. Bring every little guest to safety!",
				"Rescue all 26 hatchlings for the family send-off.",
			],
		),
	];
	// The roof opens two cross-links in the conservatory grammar: a new evacuation circuit.
	const roof = FLOORS[4],
		rr = roof.rows.map((r) => r.split(""));
	for (let x = 1; x <= 7; x++) rr[5][x] = ".";
	for (let x = 9; x <= 19; x++) rr[9][x] = ".";
	FLOORS[4] = Object.freeze({
		...roof,
		rows: rr.map((r) => r.join("")),
		layout: 4,
	});
	const SYMBOLS = ["★", "♥", "◆", "●"];
	const HOME_COLORS = ["#f3ca72", "#f19cba", "#82d9d0", "#b7c7fa"];
	Object.assign(T, {
		TILE,
		DIRS,
		DEFAULT_BALANCE,
		BALANCE_LIMITS,
		FLOORS,
		SYMBOLS,
		HOME_COLORS,
	});
})();
