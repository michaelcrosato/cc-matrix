/* Original maze data and the single workshop/generator schema. No runtime fetches. */
((root) => {
	const W = 19,
		H = 15,
		C = { x: 9, y: 7 },
		D = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		];
	const clone = (value) => JSON.parse(JSON.stringify(value));
	function rand(seed) {
		let h = 2166136261;
		for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
		return () => {
			h += 0x6d2b79f5;
			let t = h;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function key(x, y) {
		return y * W + x;
	}
	function floor(b, x, y) {
		return x >= 0 && y >= 0 && x < W && y < H && b.rows[y][x] === ".";
	}
	function neighbors(b, x, y, orientation = 0, excludeCenter = false) {
		const out = [];
		for (let d = 0; d < 4; d++) {
			let nx = x + D[d][0],
				ny = y + D[d][1];
			if (b.tunnels && y === (b.tunnelRow ?? 7) && d === 3 && x === 0)
				nx = W - 1;
			if (b.tunnels && y === (b.tunnelRow ?? 7) && d === 1 && x === W - 1)
				nx = 0;
			if (!floor(b, nx, ny)) continue;
			const fromCenter = x === 9 && y === 7,
				toCenter = nx === 9 && ny === 7;
			if (excludeCenter && (fromCenter || toCenter)) continue;
			if (b.gate && (fromCenter || toCenter)) {
				const edge = fromCenter ? d : (d + 2) % 4;
				if (edge !== orientation) continue;
			}
			out.push({ x: nx, y: ny, dir: d });
		}
		return out;
	}
	function graphStats(b, orientation = 0, excludeCenter = false) {
		let cells = [],
			edgeCount = 0;
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++)
				if (floor(b, x, y) && !(excludeCenter && x === 9 && y === 7)) {
					cells.push({ x, y });
					edgeCount += neighbors(b, x, y, orientation, excludeCenter).length;
				}
		const visited = new Set(),
			todo = cells.length ? [cells[0]] : [];
		while (todo.length) {
			const p = todo.pop(),
				k = key(p.x, p.y);
			if (visited.has(k)) continue;
			visited.add(k);
			todo.push(...neighbors(b, p.x, p.y, orientation, excludeCenter));
		}
		return {
			cells: cells.length,
			reachable: visited.size,
			loops: Math.round(edgeCount / 2) - cells.length + 1,
			visited,
		};
	}
	function validate(b) {
		const errors = [],
			add = (message, cells = []) => errors.push({ message, cells });
		if (!b || typeof b !== "object" || Array.isArray(b))
			return {
				ok: false,
				errors: [
					{ message: "Import a maze object, not a list or text.", cells: [] },
				],
				stats: {},
			};
		if (b.schemaVersion !== 1) add("This maze needs schemaVersion 1.");
		if (
			!Array.isArray(b.rows) ||
			b.rows.length !== H ||
			b.rows.some(
				(r) => typeof r !== "string" || r.length !== W || /[^.#]/.test(r),
			)
		) {
			add(
				"Use exactly 15 rows of 19 cells; only . floor and # wall are allowed.",
			);
			return { ok: false, errors, stats: {} };
		}
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				if (x !== 0 && x !== W - 1 && y !== 0 && y !== H - 1) continue;
				if (b.tunnels && y === (b.tunnelRow ?? 7) && (x === 0 || x === W - 1))
					continue;
				if (floor(b, x, y))
					add("Keep the outer frame closed except for paired tunnel mouths.", [
						{ x, y },
					]);
			}
		if (
			typeof b.tunnels !== "boolean" ||
			typeof b.gate !== "boolean" ||
			typeof b.invisible !== "boolean"
		)
			add("Tunnel, gate and disappearing-wall switches must be true or false.");
		if (b.tunnels) {
			if ((b.tunnelRow ?? 7) !== 7) add("The paired tunnel preset uses row 7.");
			for (const x of [0, 1, 17, 18])
				if (!floor(b, x, 7))
					add("Open both tunnel mouths and their approach cells.", [
						{ x, y: 7 },
					]);
		}
		for (const p of [C, ...D.map((d) => ({ x: 9 + d[0], y: 7 + d[1] }))])
			if (!floor(b, p.x, p.y))
				add("Keep the permanent central pen and its four approaches open.", [
					p,
				]);
		if (b.gateCenter && (b.gateCenter.x !== 9 || b.gateCenter.y !== 7))
			add("The permanent pen belongs at column 9, row 7.");
		const location = (p, label) => {
			if (
				!p ||
				!Number.isInteger(p.x) ||
				!Number.isInteger(p.y) ||
				!floor(b, p.x, p.y)
			) {
				add(`${label} must occupy an open cell.`, p ? [p] : []);
				return false;
			}
			if (p.x === 9 && p.y === 7) {
				add(`${label} cannot start inside the rotating pen.`, [p]);
				return false;
			}
			return true;
		};
		const occupied = new Map();
		const reserve = (p, label) => {
			if (!location(p, label)) return;
			const k = key(p.x, p.y);
			if (occupied.has(k)) add(`${label} overlaps ${occupied.get(k)}.`, [p]);
			else occupied.set(k, label);
		};
		if (!Array.isArray(b.spawn) || b.spawn.length !== 2)
			add("Place exactly two hero starts, even for a solo board.");
		else
			b.spawn.forEach((p, i) => {
				reserve(p, `Hero ${i + 1}`);
			});
		if (!Array.isArray(b.enemySpawns) || b.enemySpawns.length !== 3)
			add("Place exactly three predator starts.");
		else
			b.enemySpawns.forEach((p, i) => {
				reserve(p, `Predator ${i + 1}`);
			});
		if (!Array.isArray(b.foods) || b.foods.length !== 12)
			add("Place exactly twelve snacks: eight ordinary and four bright.");
		else {
			const ids = new Set();
			let power = 0;
			b.foods.forEach((p, i) => {
				reserve(p, `Snack ${i + 1}`);
				if (!p || typeof p !== "object") return;
				if (
					typeof p.id !== "string" ||
					!p.id.length ||
					p.id.length > 40 ||
					ids.has(p.id)
				)
					add("Give every snack a unique short text ID.", [p]);
				ids.add(p.id);
				if (p.power === true) power++;
				else if (p.power !== false)
					add("Each snack needs a true or false bright flag.", [p]);
				if (
					p.dir !== undefined &&
					(!Number.isInteger(p.dir) || p.dir < 0 || p.dir > 3)
				)
					add("Snack travel direction must be 0, 1, 2 or 3.", [p]);
			});
			if (power !== 4)
				add("Use exactly four bright snacks and eight ordinary snacks.");
		}
		let stats = {};
		for (let o = 0; o < (b.gate ? 4 : 1); o++) {
			const s = graphStats(b, o);
			if (o === 0)
				stats = { cells: s.cells, loops: s.loops, reachable: s.reachable };
			if (s.cells !== s.reachable) {
				const bad = [];
				for (let y = 0; y < H; y++)
					for (let x = 0; x < W; x++)
						if (floor(b, x, y) && !s.visited.has(key(x, y))) bad.push({ x, y });
				add(
					"Join every corridor; this maze has an unreachable pocket in gate position " +
						(o + 1) +
						".",
					bad.slice(0, 8),
				);
				break;
			}
		}
		const outer = graphStats(b, 0, true);
		if (outer.cells !== outer.reachable)
			add("Keep an outer route around the pen, so no rotation traps a snack.");
		if (outer.loops < 4)
			add("Add cross-links: the maze needs at least four interception loops.");
		if (Array.isArray(b.spawn) && Array.isArray(b.enemySpawns))
			for (const s of b.spawn)
				for (const e of b.enemySpawns)
					if (s && e && Math.abs(s.x - e.x) + Math.abs(s.y - e.y) < 5)
						add(
							"Move predator starts at least five cells from each hero start.",
							[s, e],
						);
		return { ok: errors.length === 0, errors, stats };
	}
	function baseRows(rectangles, tunnels) {
		const a = Array.from({ length: H }, (_, y) =>
			Array.from({ length: W }, (_, x) =>
				x === 0 || y === 0 || x === W - 1 || y === H - 1 ? "#" : ".",
			),
		);
		for (const [x1, y1, x2, y2] of rectangles)
			for (let y = y1; y <= y2; y++)
				for (let x = x1; x <= x2; x++) a[y][x] = "#";
		for (const p of [
			C,
			...D.map((d) => ({ x: 9 + d[0], y: 7 + d[1] })),
			{ x: 1, y: 1 },
			{ x: 1, y: 2 },
		])
			a[p.y][p.x] = ".";
		if (tunnels) {
			a[7][0] = ".";
			a[7][1] = ".";
			a[7][17] = ".";
			a[7][18] = ".";
		}
		return a.map((r) => r.join(""));
	}
	function populate(board, rng = () => 0.5) {
		const reserved = new Set(
			[...board.spawn, ...board.enemySpawns, C].map((p) => key(p.x, p.y)),
		);
		const wishes = [
			[3, 1, false],
			[6, 1, true],
			[16, 1, true],
			[17, 12, true],
			[1, 12, true],
			[9, 1, false],
			[17, 5, false],
			[15, 7, false],
			[3, 7, false],
			[7, 13, false],
			[11, 13, false],
			[9, 10, false],
		];
		board.foods = wishes.map(([wx, wy, power], i) => {
			const all = [];
			for (let y = 1; y < H - 1; y++)
				for (let x = 1; x < W - 1; x++)
					if (
						floor(board, x, y) &&
						!reserved.has(key(x, y)) &&
						neighbors(board, x, y, 0, true).length >= 2
					)
						all.push({
							x,
							y,
							rank: Math.abs(wx - x) + Math.abs(wy - y) + rng() * 0.05,
						});
			all.sort((a, b) => a.rank - b.rank);
			const p = all[0];
			if (!p) throw new Error("Maze has too few safe snack starts");
			reserved.add(key(p.x, p.y));
			const dirs = neighbors(board, p.x, p.y, 0, true);
			return {
				id: `snack-${String(i + 1).padStart(2, "0")}`,
				x: p.x,
				y: p.y,
				power,
				dir: dirs[Math.floor(rng() * dirs.length)].dir,
			};
		});
		return board;
	}
	function authored(id, name, rects, opts = {}) {
		const b = {
			schemaVersion: 1,
			id,
			name,
			rows: baseRows(rects, !!opts.tunnels),
			spawn: [
				{ x: 1, y: 1 },
				{ x: 1, y: 2 },
			],
			enemySpawns: [
				{ x: 9, y: 6 },
				{ x: 10, y: 7 },
				{ x: 9, y: 8 },
			],
			gateCenter: clone(C),
			tunnelRow: 7,
			tunnels: !!opts.tunnels,
			gate: !!opts.gate,
			invisible: !!opts.invisible,
			seed: `authored-${id}`,
			hint: opts.hint || "",
			clearCue: opts.clearCue || "Twelve terrific nibbles!",
			palette: opts.palette || "#ae70ff",
			releaseTimes: opts.releaseTimes || [8, 12, 16],
			enemySpeedScale: opts.enemySpeedScale || 1,
			revealPeriod: opts.revealPeriod || 7,
			foodRouteCommit: 3,
		};
		return populate(b, rand(b.seed));
	}
	const layouts = [
		[
			[3, 2, 5, 3],
			[8, 2, 10, 3],
			[13, 2, 15, 3],
			[2, 5, 4, 6],
			[6, 5, 7, 8],
			[11, 5, 12, 8],
			[14, 5, 16, 6],
			[2, 8, 4, 9],
			[14, 8, 16, 9],
			[3, 11, 5, 12],
			[8, 11, 10, 12],
			[13, 11, 15, 12],
		],
		[
			[3, 2, 4, 5],
			[7, 2, 8, 4],
			[11, 2, 12, 4],
			[15, 2, 16, 5],
			[3, 8, 4, 11],
			[7, 10, 8, 12],
			[11, 10, 12, 12],
			[15, 8, 16, 11],
			[6, 6, 7, 8],
			[11, 6, 12, 8],
			[6, 6, 6, 6],
			[12, 6, 12, 6],
		],
		[
			[2, 2, 4, 3],
			[6, 2, 8, 2],
			[10, 2, 12, 2],
			[14, 2, 16, 3],
			[6, 4, 8, 6],
			[10, 4, 12, 6],
			[6, 8, 8, 10],
			[10, 8, 12, 10],
			[2, 5, 3, 9],
			[15, 5, 16, 9],
			[2, 11, 4, 12],
			[6, 12, 8, 12],
			[10, 12, 12, 12],
			[14, 11, 16, 12],
		],
		[
			[3, 2, 7, 3],
			[10, 2, 11, 4],
			[14, 2, 16, 3],
			[2, 5, 4, 6],
			[6, 5, 7, 9],
			[11, 6, 12, 9],
			[14, 5, 16, 6],
			[2, 9, 4, 10],
			[14, 9, 16, 10],
			[3, 12, 7, 12],
			[9, 11, 11, 12],
			[14, 12, 16, 12],
		],
		[
			[2, 2, 5, 3],
			[7, 2, 8, 3],
			[10, 2, 11, 3],
			[13, 2, 16, 3],
			[3, 5, 4, 9],
			[6, 5, 8, 6],
			[10, 5, 12, 6],
			[14, 5, 15, 9],
			[6, 8, 8, 9],
			[10, 8, 12, 9],
			[2, 11, 5, 12],
			[7, 11, 8, 12],
			[10, 11, 11, 12],
			[13, 11, 16, 12],
		],
	];
	const stages = [
		authored("open-loops", "Nibble Boulevard", layouts[0], {
			hint: "The snacks scoot! Cut across a loop. Bright bites make bullies edible.",
			clearCue: "A delicious first dozen.",
			palette: "#ae70ff",
			enemySpeedScale: 0.88,
		}),
		authored("side-doors", "Side-Door Supper", layouts[1], {
			tunnels: true,
			hint: "Those striped side doors join up. Meet a snack on the other side!",
			clearCue: "You took the tasty shortcut.",
			palette: "#7894ff",
			releaseTimes: [6, 10, 14],
			enemySpeedScale: 0.94,
		}),
		authored("turning-center", "The Turning Table", layouts[2], {
			tunnels: true,
			gate: true,
			hint: "One door. Four sides. Ride the turning table to beat the long way round.",
			clearCue: "A perfectly timed table turn.",
			palette: "#d07bff",
			releaseTimes: [5, 9, 13],
		}),
		authored("vanishing-lanes", "Peek-a-Chew", layouts[3], {
			tunnels: true,
			gate: true,
			invisible: true,
			hint: "Walls take a nap. Chirp to see them; they still stop your feet.",
			clearCue: "Out of sight. Into supper.",
			palette: "#80bcff",
			releaseTimes: [5, 8, 11],
			revealPeriod: 6.5,
		}),
		null,
		authored("finale", "The Midnight Munch", layouts[4], {
			tunnels: true,
			gate: true,
			invisible: true,
			hint: "One last late-night feast. Watch the doors, trust your chirp, catch that last bite!",
			clearCue: "All nibbled. Nothing left but giggles.",
			palette: "#f4a8ff",
			releaseTimes: [4, 7, 10],
			enemySpeedScale: 1.08,
			revealPeriod: 7.5,
		}),
	];
	function generate(seed = "snacktime", options = {}) {
		const random = rand(seed),
			tunnels = options.tunnels !== false,
			gate = options.gate !== false,
			invisible = !!options.invisible;
		let b = authored("remix", "Seeded Supper", [], {
			tunnels,
			gate,
			invisible,
			hint: "A fresh maze, the same hungry rules. Your seed makes the same supper.",
			palette: "#89d9c3",
			releaseTimes: [5, 9, 13],
		});
		b.seed = String(seed).slice(0, 80) || "snacktime";
		b.fallback = false;
		b.options = {
			tunnels,
			gate,
			invisible,
			density: options.density || "normal",
		};
		let made = 0;
		const target =
			options.density === "open" ? 17 : options.density === "twisty" ? 34 : 26;
		const protectedCells = new Set(
			[
				...b.spawn,
				...b.enemySpawns,
				C,
				...D.map((d) => ({ x: 9 + d[0], y: 7 + d[1] })),
				{ x: 1, y: 7 },
				{ x: 17, y: 7 },
			].map((p) => key(p.x, p.y)),
		);
		let rows = b.rows.map((r) => r.split(""));
		for (let attempt = 0; attempt < 150 && made < target; attempt++) {
			const x = 2 + Math.floor(random() * 15),
				y = 2 + Math.floor(random() * 11),
				vertical = random() < 0.5,
				len = 2 + Math.floor(random() * 3);
			const next = rows.map((r) => r.slice());
			let valid = true;
			for (let k = 0; k < len; k++) {
				const nx = x + (vertical ? 0 : k),
					ny = y + (vertical ? k : 0);
				if (nx > 16 || ny > 12 || protectedCells.has(key(nx, ny))) {
					valid = false;
					break;
				}
				next[ny][nx] = "#";
			}
			if (!valid) continue;
			const candidate = { ...b, rows: next.map((r) => r.join("")) };
			const s = graphStats(candidate, 0, true);
			if (s.cells !== s.reachable || s.loops < 8 || s.cells < 125) continue;
			rows = next;
			made++;
		}
		b.rows = rows.map((r) => r.join(""));
		populate(b, random);
		const v = validate(b);
		if (!v.ok) {
			b = clone(stages[1]);
			b.id = "remix";
			b.name = "Seeded Supper";
			b.seed = String(seed).slice(0, 80);
			b.gate = gate;
			b.invisible = invisible;
			b.fallback = true;
			b.diagnostic =
				"Bounded generator used the validated Side-Door Supper fallback.";
		}
		return b;
	}
	stages[4] = generate("CHOMP-1981", {
		tunnels: true,
		gate: true,
		invisible: false,
	});
	Object.assign(stages[4], {
		id: "seeded-remix",
		name: "Shuffle Snack Shack",
		hint: "Freshly shuffled corridors. Every seed has loops; every snack has somewhere to scoot.",
		clearCue: "A shuffle well supped.",
		enemySpeedScale: 1.03,
	});
	const templates = [stages[0], stages[2], stages[5]].map(clone);
	const schema = {
		version: 1,
		width: W,
		height: H,
		wall: "#",
		floor: ".",
		pen: clone(C),
		tunnelRow: 7,
		foodCount: 12,
		powerCount: 4,
		playerStartCount: 2,
		predatorCount: 3,
	};
	function importBoard(text) {
		let board;
		try {
			board = JSON.parse(text);
		} catch {
			return {
				ok: false,
				errors: [
					{
						message: "That is not valid JSON. Paste an exported maze.",
						cells: [],
					},
				],
			};
		}
		const result = validate(board);
		return result.ok ? { ...result, board: clone(board) } : result;
	}
	root.ChompContent = {
		stages,
		templates,
		generate,
		validate,
		clone,
		neighbors,
		schema,
		importBoard,
		exportBoard: (board) => JSON.stringify(board, null, 2),
	};
})(typeof window === "undefined" ? globalThis : window);
