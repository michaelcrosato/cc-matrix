/* Original content for Turtley Booked. Tile scale and graph derive from my-3D2dge. */
globalThis.TB = globalThis.TB || {};
((T) => {
	T.IDENTITY = {
		title: "Turtley Booked",
		tagline: "Small shells. Big room service.",
		id: "Turtley-Booked-Turtles-gpt-6.1-sol-max-20261106-033015",
	};
	T.DEFAULTS = Object.freeze({
		playerSpeed: 3.5,
		carrySpeed: 0.9,
		enemySpeed: 1,
		yellowAt: 18,
		redAt: 42,
		stun: 3,
		bombLife: 6,
		recharge: 6,
	});
	T.ENEMY_SPEEDS = Object.freeze({ blue: 1.8, yellow: 2.1, red: 2.4 });
	T.SLIDERS = [
		["playerSpeed", "Turtle speed", 2, 5, 0.1],
		["carrySpeed", "Carrying speed", 0.7, 1, 0.05],
		["enemySpeed", "Beetle speed", 0.5, 1.3, 0.05],
		["yellowAt", "Yellow age", 6, 36, 1],
		["redAt", "Red age", 15, 65, 1],
		["stun", "Stun seconds", 1, 7, 0.25],
		["bombLife", "Bomb seconds", 2, 10, 0.5],
		["recharge", "Supply seconds", 2, 12, 0.5],
	];
	const layouts = [
		[
			"#####################",
			"#...................#",
			"#.###.###.#.###.###.#",
			"#...................#",
			"#.###.#.#####.#.###.#",
			"#.....#.......#.....#",
			"#...................#",
			"#.....#.......#.....#",
			"#.###.#.#####.#.###.#",
			"#...................#",
			"#.###.###.#.###.###.#",
			"#...................#",
			"#####################",
		],
		[
			"#####################",
			"#...................#",
			"#.###.###.#.###.###.#",
			"#.....#.......#.....#",
			"#.###.#.###.#.#.###.#",
			"#...#.....#.....#...#",
			"#.#...............#.#",
			"#...#.....#.....#...#",
			"#.###.#.#.###.#.###.#",
			"#.....#.......#.....#",
			"#.###.###.#.###.###.#",
			"#...................#",
			"#####################",
		],
		[
			"#####################",
			"#...................#",
			"#.###.#.#####.#.###.#",
			"#.....#.......#.....#",
			"#.#.#.#.###.#.#.###.#",
			"#.#.......#...#.....#",
			"#...................#",
			"#.....#...#.......#.#",
			"#.###.#.#.###.#.#.#.#",
			"#.....#.......#.....#",
			"#.###.#.#####.#.###.#",
			"#...................#",
			"#####################",
		],
		[
			"#####################",
			"#...................#",
			"#.###.###.#.###.###.#",
			"#...#...........#...#",
			"#.#.#.###.#.###.#.#.#",
			"#.#.....#...#.....#.#",
			"#...................#",
			"#.#.....#...#.....#.#",
			"#.#.#.###.#.###.#.#.#",
			"#...#...........#...#",
			"#.###.###.#.###.###.#",
			"#...................#",
			"#####################",
		],
		[
			"#####################",
			"#...................#",
			"#.###.#.#####.#.###.#",
			"#.....#.......#.....#",
			"#.###.#.#.#.#.#.###.#",
			"#...#...#...#...#...#",
			"#...................#",
			"#...#...#...#...#...#",
			"#.###.#.#.#.#.#.###.#",
			"#.....#.......#.....#",
			"#.###.#.#####.#.###.#",
			"#...................#",
			"#####################",
		],
	];
	const names = [
		"The Welcome Lobby",
		"Laundry Lanes",
		"The Glasshouse",
		"The Velvet Suites",
		"Rooftop Rendezvous",
	];
	const subtitles = [
		"A tiny guest is waiting. Follow the question marks.",
		"Yellow beetles see along halls. Break their sight.",
		"Red beetles turn corners. Leave a little surprise.",
		"One bomb for the team. Two shells, twice the heart.",
		"Last call for little lodgers. Everyone leaves together!",
	];
	const palettes = [
		["#263f44", "#435c60", "#91a69b", "#162c34", "#23404a", "#edbd73"],
		["#263e56", "#42637d", "#7dabae", "#182c45", "#213f56", "#a6dfde"],
		["#25443d", "#416249", "#a3b375", "#172e2a", "#294b3b", "#e1c879"],
		["#433347", "#6e5064", "#c29e94", "#2c2139", "#44304b", "#e8b6b6"],
		["#324b54", "#577278", "#d0b882", "#172c3e", "#2a4555", "#ffe3a2"],
	];
	const roomCells = [
		[
			[7, 9],
			[3, 3],
			[17, 3],
			[17, 9],
		],
		[
			[3, 9],
			[7, 5],
			[17, 3],
			[13, 9],
			[3, 3],
			[17, 9],
		],
		[
			[3, 9],
			[7, 3],
			[17, 3],
			[13, 9],
			[3, 3],
			[17, 9],
			[11, 1],
		],
		[
			[7, 9],
			[3, 3],
			[17, 3],
			[13, 9],
			[7, 3],
			[17, 9],
			[3, 9],
			[11, 1],
		],
		[
			[3, 9],
			[7, 3],
			[17, 3],
			[13, 9],
			[3, 3],
			[17, 9],
			[11, 1],
			[9, 5],
		],
	];
	const starts = [
		[[10, 1]],
		[
			[5, 1],
			[15, 1],
		],
		[
			[5, 1],
			[15, 1],
			[1, 6],
		],
		[
			[5, 1],
			[15, 1],
			[19, 6],
		],
		[
			[5, 1],
			[15, 1],
			[1, 6],
			[19, 6],
		],
	];
	T.FLOORS = layouts.map((rows, i) => ({
		id: i,
		name: names[i],
		subtitle: subtitles[i],
		rows,
		quota: [4, 5, 5, 6, 6][i],
		rooms: roomCells[i],
		homes: [
			[1, 1],
			[19, 1],
			[1, 11],
			[19, 11],
		],
		spawns: [
			[9, 11],
			[11, 11],
		],
		supply: [10, 6],
		enemies: starts[i].map((cell, j) => ({
			cell,
			age: i === 2 && j === 1 ? 38 : i >= 3 && j === 1 ? 20 : 0,
		})),
		wall: palettes[i][0],
		side: palettes[i][1],
		trim: palettes[i][2],
		floor: palettes[i][3],
		carpet: palettes[i][4],
		accent: palettes[i][5],
		staging: [
			"Brass bell & luggage",
			"Spinning laundry",
			"Moonlit palms",
			"Velvet & gold",
			"Lanterns & a rescue airship",
		][i],
		wallFace: i === 2 || i === 4 ? "hedge" : i === 3 ? "plank" : "plaster",
		props: [
			[3, 2, "pot"],
			[17, 2, "pot"],
			[3, 10, "jar"],
			[17, 10, "jar"],
		],
	}));
	T.DIRS = [
		[0, -1],
		[-1, 0],
		[0, 1],
		[1, 0],
	];
	T.cell = (a) => [Math.round(a.m.x), Math.round(a.m.y)];
	T.same = (a, b) => a[0] === b[0] && a[1] === b[1];
	T.dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
	T.world = (m) => ({ x: (m.x + 0.5) * 16, y: (m.y + 0.5) * 16, z: 0 });
	T.makeMap = (f) =>
		new My3D2dge.TileMap({
			rows: f.rows,
			legend: { "#": 1 },
			types: {
				1: {
					h: 5,
					top: f.wall,
					side: f.side,
					line: f.trim,
					face: f.wallFace,
					roof: "slab",
				},
			},
			outside: false,
			ao: 2,
			floorTex: (x, y) => {
				const c =
					(Math.floor(x / 16) + Math.floor(y / 16)) & 1 ? f.floor : f.carpet;
				const v = My3D2dge.hex(c),
					n = (x * 13 + y * 7) % 17 === 0 ? 4 : 0;
				return v.map((a) => a + n);
			},
		});
	T.validate = (f) => {
		const errors = [],
			E = My3D2dge;
		if (f.rows.length !== 13 || f.rows.some((r) => r.length !== 21))
			errors.push("Grid must be 21 by 13");
		const map = T.makeMap(f),
			grid = E.Grid.from(map),
			cells = [];
		for (let y = 0; y < 13; y++)
			for (let x = 0; x < 21; x++) if (map.walkable(x, y)) cells.push([x, y]);
		for (const p of cells)
			if (!grid.path(cells[0], p).length) {
				errors.push("Disconnected corridor " + p);
				break;
			}
		if (!Number.isInteger(f.quota) || f.quota > f.rooms.length || f.quota < 1)
			errors.push("Impossible rescue quota");
		const tagged = [
			...f.rooms,
			...f.homes,
			...f.spawns,
			f.supply,
			...f.enemies.map((e) => e.cell),
		];
		if (new Set(tagged.map((c) => c.join(","))).size !== tagged.length)
			errors.push("Spawn/objective conflict");
		for (const p of tagged)
			if (!map.walkable(...p)) errors.push("Invalid cell " + p);
		for (const p of f.rooms)
			if (f.homes.filter((h) => grid.path(p, h).length).length < 2)
				errors.push("Fewer than two reachable homes");
		if (f.homes.some(([x, y]) => x !== 1 && x !== 19 && y !== 1 && y !== 11))
			errors.push("Home is not at edge");
		return errors;
	};
})(globalThis.TB);
