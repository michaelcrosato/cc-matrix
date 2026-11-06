((G) => {
	const TILE = 16,
		center = (n) => (n + 0.5) * TILE,
		point = (x, y) => ({ x: center(x), y: center(y) });
	const room = (id, name, x, y, w, h, purpose, tip) => ({
		id,
		name,
		x,
		y,
		w,
		h,
		purpose,
		tip,
	});
	const enemy = (id, kind, cx, cy, extra = {}) => ({
		id,
		kind,
		...point(cx, cy),
		...extra,
	});
	const pickup = (id, kind, cx, cy, count = 1, extra = {}) => ({
		id,
		kind,
		...point(cx, cy),
		count,
		...extra,
	});
	const prop = (kind, cx, cy, extra = {}) => ({
		id: `${kind}-${cx}-${cy}`,
		kind,
		...point(cx, cy),
		...extra,
	});
	const palettes = {
		chalk: {
			floor: "#5d6264",
			floorAlt: "#686b65",
			wall: "#737774",
			wallSide: "#343e42",
			accent: "#e9bf73",
			fog: "#071119",
			light: "#ffe0a3",
			theme: "chalk",
		},
		root: {
			floor: "#394c42",
			floorAlt: "#435649",
			wall: "#58624b",
			wallSide: "#223d35",
			accent: "#ade095",
			fog: "#06130f",
			light: "#d1ef9c",
			theme: "root",
		},
		tide: {
			floor: "#3b5660",
			floorAlt: "#496774",
			wall: "#64838b",
			wallSide: "#233c52",
			accent: "#9be3ef",
			fog: "#05121d",
			light: "#a3edff",
			theme: "tide",
		},
		ember: {
			floor: "#594747",
			floorAlt: "#6b5146",
			wall: "#896759",
			wallSide: "#473342",
			accent: "#ffc487",
			fog: "#180b17",
			light: "#ffcb96",
			theme: "ember",
		},
		rime: {
			floor: "#3b4c6b",
			floorAlt: "#4c6280",
			wall: "#7c94b5",
			wallSide: "#28354d",
			accent: "#b9dcff",
			fog: "#080e20",
			light: "#bcdcff",
			theme: "rime",
		},
	};
	// Authored room rectangles are compiled into collision/drawing rows. Links are explicit, never procedural.
	function compile(spec) {
		const W = spec.width,
			H = spec.height,
			cells = Array.from({ length: H }, () => Array(W).fill("#"));
		const carve = (x, y, w, h) => {
			for (let yy = y; yy < y + h; yy++)
				for (let xx = x; xx < x + w; xx++)
					if (xx > 0 && yy > 0 && xx < W - 1 && yy < H - 1) cells[yy][xx] = ".";
		};
		for (const r of spec.rooms) carve(r.x, r.y, r.w, r.h);
		for (const link of spec.links) {
			const [a, b] = link.points;
			const width = link.width || 3;
			if (a[0] === b[0])
				carve(
					a[0] - Math.floor(width / 2),
					Math.min(a[1], b[1]),
					width,
					Math.abs(a[1] - b[1]) + 1,
				);
			else if (a[1] === b[1])
				carve(
					Math.min(a[0], b[0]),
					a[1] - Math.floor(width / 2),
					Math.abs(a[0] - b[0]) + 1,
					width,
				);
			else throw Error(`Link must be axial ${spec.id}`);
		}
		return {
			...spec,
			props: spec.props.map((p) => ({ ...p, id: `${spec.id}-prop-${p.id}` })),
			tile: TILE,
			rows: cells.map((r) => r.join("")),
			palette: palettes[spec.id],
			spawn: [center(spec.spawnCell[0]), center(spec.spawnCell[1])],
			exit: {
				...point(...spec.exitCell),
				radius: 25,
				guard: spec.exitGuard || null,
				requires: spec.reward || null,
			},
			safeAnchors: [
				point(...spec.spawnCell),
				...(spec.anchors || []).map((v) => point(...v)),
			],
			banks: (spec.banks || []).map((b) => ({
				...b,
				a: b.a.map((v) => v * TILE),
				b: b.b.map((v) => v * TILE),
			})),
		};
	}
	const caves = {};
	caves.chalk = compile({
		id: "chalk",
		name: "The Pale Below",
		subtitle: "I · THE AXE IN THE DARK",
		width: 83,
		height: 38,
		spawnCell: [5, 27],
		exitCell: [76, 13],
		exitGuard: "chalk-ladder-snake",
		reward: "axe",
		entrance: "The entrance crumbles behind you. Find the marked ladder.",
		rooms: [
			room(
				"chalk-threshold",
				"Lantern Threshold",
				2,
				22,
				11,
				10,
				"Learn to move; a one-way descent.",
				"WASD / left stick to move. The mountain keeps what you have seen.",
			),
			room(
				"chalk-practice",
				"The Archer’s Rest",
				18,
				22,
				12,
				10,
				"A safe first shot, recoverable arrows and a supply.",
				"Aim, then fire once. A missed shaft can be picked up. Keep three arrows for what waits.",
			),
			room(
				"chalk-scratching",
				"Scratcher’s Crossing",
				35,
				22,
				12,
				10,
				"First rat, tracks and a deliberate shot.",
				"Small prints. Scratching beyond the stones. Listen before you hurry.",
			),
			room(
				"chalk-fork",
				"The Split Cairn",
				35,
				7,
				12,
				10,
				"A dark junction and an optional supply route.",
				"Fresh claw marks turn east. The old cairn points toward a spare quiver.",
			),
			room(
				"chalk-coil",
				"Coil Gallery",
				51,
				7,
				13,
				11,
				"Sleeping snake, telegraph and the axe.",
				"The raised head means a straight lunge. Step aside; shoot while it settles.",
			),
			room(
				"chalk-ladder",
				"Daylight Shaft",
				69,
				7,
				11,
				11,
				"Guarded ladder and required tool exit.",
				"A ladder! Claim the axe before you climb. Every way forward is still a way deeper.",
			),
			room(
				"chalk-cairn",
				"The Unmarked Cairn",
				51,
				23,
				11,
				10,
				"Optional heart and recovered expedition journal.",
				"Someone left the heavy things and carried on. Their arrows are still sound.",
			),
		],
		links: [
			{
				points: [
					[12, 27],
					[35, 27],
				],
			},
			{
				points: [
					[41, 27],
					[41, 15],
				],
			},
			{
				points: [
					[46, 12],
					[69, 12],
				],
			},
			{
				points: [
					[46, 27],
					[51, 27],
				],
			},
		],
		enemies: [
			enemy("chalk-rat", "rat", 41, 27, { tutorial: true }),
			enemy("chalk-coil-snake", "snake", 57, 12),
			enemy("chalk-ladder-snake", "snake", 74, 12),
		],
		pickups: [
			pickup("chalk-rest-quiver", "arrows", 24, 26, 7),
			pickup("chalk-fork-quiver", "arrows", 39, 11, 5),
			pickup("chalk-axe", "axe", 60, 12, 1, { guard: "chalk-coil-snake" }),
			pickup("chalk-cairn-heart", "heart", 56, 28),
			pickup("chalk-cairn-treasure", "treasure", 57, 27),
		],
		props: [
			prop("lantern", 6, 25),
			prop("target", 25, 29),
			prop("sign", 21, 24),
			prop("bones", 38, 26),
			prop("rock", 43, 25),
			prop("cairn", 38, 10),
			prop("crystal", 53, 9),
			prop("crystal", 61, 9),
			prop("ladder", 76, 13),
			prop("torch", 71, 9),
			prop("bones", 54, 26),
		],
		tracks: [
			{ kind: "rat", from: [35, 27], to: [40, 27] },
			{ kind: "snake", from: [52, 13], to: [57, 12] },
		],
		banks: [{ id: "chalk-practice-bank", a: [27, 23], b: [29, 25] }],
		anchors: [
			[24, 27],
			[40, 12],
		],
	});
	caves.root = compile({
		id: "root",
		name: "Briarwake Hollows",
		subtitle: "II · THE BOAT UNDER ROOTS",
		width: 83,
		height: 40,
		spawnCell: [5, 29],
		exitCell: [76, 28],
		exitGuard: "root-ladder-drake",
		reward: "boat",
		entrance:
			"The briar slope slides shut. The northern rootway is the only passage.",
		rooms: [
			room(
				"root-entry",
				"The Felled Door",
				2,
				24,
				11,
				10,
				"Forest opening and the echo of the axe.",
				"The axe has opened the forest. Below it, roots have swallowed an older road.",
			),
			room(
				"root-bank",
				"Mirrorstone Bend",
				18,
				23,
				14,
				12,
				"Mandatory safe bank shot at a hanging gong; bridge opens.",
				"Bank from the pale notch north of the bevel. Aim along its bright inlay; the bounced shaft will ring the gong.",
			),
			room(
				"root-roost",
				"The Listening Roof",
				35,
				6,
				12,
				11,
				"Bats mask a hiss; tracks remain readable.",
				"Wings can drown a hiss. Prints and moving dust tell the same tale.",
			),
			room(
				"root-web",
				"The Silver Pantry",
				53,
				6,
				12,
				12,
				"Spider theft and a free shaft stash.",
				"Spiders hoard fallen shafts. Follow silver drag marks; no arrow is needed to reclaim the stash.",
			),
			room(
				"root-ferry",
				"The Folded Ferry",
				53,
				24,
				12,
				11,
				"Boat under a coil; optional costly treasure.",
				"A boat of bark and brass. It will remember every river you cross.",
			),
			room(
				"root-ladder",
				"The Root Stair",
				70,
				23,
				11,
				12,
				"Ground drake guards ladder; return shortcut.",
				"Heavy prints. A long breath before the charge. The roots leave room to step aside.",
			),
		],
		links: [
			{
				points: [
					[12, 29],
					[40, 29],
				],
			},
			{
				points: [
					[40, 29],
					[40, 16],
				],
			},
			{
				points: [
					[40, 16],
					[40, 11],
				],
			},
			{
				points: [
					[46, 11],
					[53, 11],
				],
			},
			{
				points: [
					[59, 16],
					[59, 24],
				],
			},
			{
				points: [
					[64, 29],
					[70, 29],
				],
			},
		],
		gates: [
			{
				id: "root-gong-bridge",
				cx: 40,
				cy: 21,
				w: 3,
				h: 1,
				requires: "bankLesson",
				reason: "The root bridge unfolds when a banked arrow rings the gong.",
			},
		],
		enemies: [
			enemy("root-gong", "target", 28, 28, { requiresBank: true }),
			enemy("root-bat", "bat", 41, 11),
			enemy("root-roost-snake", "snake", 43, 14),
			enemy("root-spider", "spider", 60, 10, {
				stash: [center(62), center(8)],
			}),
			enemy("root-boat-snake", "snake", 58, 29),
			enemy("root-ladder-drake", "drake", 75, 28),
		],
		pickups: [
			pickup("root-bank-quiver", "arrows", 22, 27, 8),
			pickup("root-web-stash", "arrows", 62, 8, 6, { stash: true }),
			pickup("root-ferry-quiver", "arrows", 55, 27, 6),
			pickup("root-boat", "boat", 62, 30, 1, { guard: "root-boat-snake" }),
			pickup("root-risk-cache", "treasure", 55, 32),
		],
		props: [
			prop("tree", 4, 25),
			prop("sign", 20, 25),
			prop("gong", 28, 28),
			prop("mushroom", 36, 9),
			prop("mushroom", 45, 15),
			prop("cobweb", 62, 7),
			prop("boat", 62, 30),
			prop("ladder", 76, 28),
			prop("torch", 72, 25),
			prop("vines", 57, 25),
		],
		tracks: [
			{ kind: "bank", from: [22, 27], to: [24, 24] },
			{ kind: "spider", from: [55, 13], to: [62, 8] },
			{ kind: "drake", from: [71, 29], to: [75, 28] },
		],
		// A southeast-facing shot at the bevel turns east toward the gong. Helpful pale inlay is authored floor decoration.
		banks: [
			{ id: "root-lesson-bevel", a: [24, 25], b: [27, 28], lesson: true },
		],
		bankLaunch: {
			x: center(24),
			y: center(24),
			ax: 3 / Math.sqrt(34),
			ay: 5 / Math.sqrt(34),
			radius: 32,
		},
		anchors: [
			[23, 29],
			[55, 28],
		],
	});
	caves.tide = compile({
		id: "tide",
		name: "The Drowned Archive",
		subtitle: "III · THE KEY UNDER WATER",
		width: 83,
		height: 41,
		spawnCell: [6, 29],
		exitCell: [76, 11],
		exitGuard: "tide-ladder-drake",
		reward: "key",
		entrance:
			"Your folded ferry carries you below the broken spillway. The current forbids return.",
		rooms: [
			room(
				"tide-entry",
				"The Unmoored Landing",
				2,
				24,
				12,
				11,
				"Boat crossing, cold masonry and supply.",
				"Water carries every sound. A bright shaft can call something you would rather not fight.",
			),
			room(
				"tide-listener",
				"The Patient Green",
				20,
				23,
				14,
				13,
				"Indestructible ooze with lure and alternate loop.",
				"The ooze sheds arrows unharmed. Put a loud shot behind it, then take the other passage.",
			),
			room(
				"tide-loop",
				"The Dry Marginalia",
				20,
				5,
				14,
				11,
				"Safe bypass of the ooze and layered sound.",
				"Words worn from stone. Only the old route marks remain: three notches, then east.",
			),
			room(
				"tide-drake",
				"The Scribe’s Watch",
				40,
				5,
				13,
				12,
				"Sleeping ground drake and safe recovery lanes.",
				"A snore beyond the shelves. Heavy prints lead toward the vault.",
			),
			room(
				"tide-index",
				"The Brass Index",
				59,
				23,
				13,
				12,
				"Key, a snake and an optional flooded cache.",
				"The Index Key opens the summit wall. The lock has waited longer than the king.",
			),
			room(
				"tide-ladder",
				"The Upward Well",
				69,
				5,
				11,
				12,
				"Exit challenge with mixed cues and clear ladder.",
				"The ladder breathes cold air. Check your quiver before the summit.",
			),
		],
		links: [
			{
				points: [
					[13, 29],
					[20, 29],
				],
			},
			{
				points: [
					[27, 24],
					[27, 15],
				],
			},
			{
				points: [
					[33, 10],
					[40, 10],
				],
			},
			{
				points: [
					[52, 10],
					[69, 10],
				],
			},
			{
				points: [
					[46, 15],
					[46, 29],
				],
			},
			{
				points: [
					[33, 29],
					[59, 29],
				],
			},
			{
				points: [
					[65, 29],
					[65, 10],
				],
			},
		],
		enemies: [
			enemy("tide-ooze", "ooze", 27, 29),
			enemy("tide-bat", "bat", 26, 10),
			enemy("tide-watch-drake", "drake", 46, 10),
			enemy("tide-key-snake", "snake", 65, 28),
			enemy("tide-ladder-drake", "drake", 75, 11),
		],
		pickups: [
			pickup("tide-landing-quiver", "arrows", 9, 28, 8),
			pickup("tide-ink-quiver", "arrows", 23, 8, 5),
			pickup("tide-vault-quiver", "arrows", 61, 26, 7),
			pickup("tide-key", "key", 68, 30, 1, { guard: "tide-key-snake" }),
			pickup("tide-drowned-treasure", "treasure", 61, 32),
			pickup("tide-vault-heart", "heart", 69, 32),
		],
		props: [
			prop("boat", 5, 27),
			prop("torch", 11, 26),
			prop("pillar", 22, 25),
			prop("pillar", 31, 32),
			prop("crystal", 22, 7),
			prop("books", 43, 7),
			prop("books", 50, 14),
			prop("chest", 68, 30),
			prop("ladder", 76, 11),
			prop("crystal", 72, 7),
			prop("bones", 61, 31),
		],
		tracks: [
			{ kind: "ooze", from: [21, 29], to: [27, 29] },
			{ kind: "drake", from: [40, 11], to: [46, 10] },
			{ kind: "snake", from: [60, 28], to: [65, 28] },
		],
		banks: [
			{ id: "tide-lure-bank", a: [30, 25], b: [33, 28] },
			{ id: "tide-watch-bank", a: [50, 7], b: [52, 9] },
		],
		anchors: [
			[9, 29],
			[25, 9],
			[61, 27],
		],
	});
	caves.ember = compile({
		id: "ember",
		name: "The Bellwether Wing",
		subtitle: "IV · A CROWN IN TWO PIECES",
		width: 65,
		height: 43,
		spawnCell: [7, 32],
		exitCell: [56, 10],
		exitGuard: "ember-guardian",
		reward: "half-ember",
		next: "rime",
		entrance:
			"The summit door closes against the storm. Two old bells answer from opposite wings.",
		rooms: [
			room(
				"ember-threshold",
				"The Crownless Hall",
				2,
				26,
				13,
				12,
				"Summit foreshadowing, reserve arrows and final preparation.",
				"Two halves of the Wayfarer’s Crown still hold the storm. Bring them together; bring the morning home.",
			),
			room(
				"ember-listener",
				"The Ear of Stone",
				21,
				25,
				13,
				13,
				"Noise placement and armored-front lesson.",
				"The Bellwether guards its face. A banked arrow or a shot from its flank finds the bright seam.",
			),
			room(
				"ember-arena",
				"The Bronze Belfry",
				39,
				5,
				21,
				21,
				"First guardian; armor, listening, flank and swoop.",
				"Listen for the bronze note. When its wings load, step out of the marked line.",
			),
			room(
				"ember-cache",
				"The Bellmaker’s Niche",
				21,
				5,
				12,
				12,
				"Optional supplies and a listening vantage.",
				"The bellmaker carried arrows instead of a hammer. A practical pilgrim.",
			),
		],
		links: [
			{
				points: [
					[14, 32],
					[21, 32],
				],
			},
			{
				points: [
					[28, 26],
					[28, 15],
				],
			},
			{
				points: [
					[28, 15],
					[39, 15],
				],
			},
			{
				points: [
					[33, 32],
					[49, 32],
				],
			},
			{
				points: [
					[49, 32],
					[49, 25],
				],
			},
		],
		enemies: [
			enemy("ember-snake", "snake", 28, 30),
			enemy("ember-guardian", "guardian1", 49, 15, {
				arena: [40, 6, 59, 25],
				name: "The Bellwether",
				hp: 3,
			}),
		],
		pickups: [
			pickup("ember-entry-quiver", "arrows", 10, 31, 12),
			pickup("ember-niche-quiver", "arrows", 25, 8, 9),
			pickup("ember-arena-quiver", "arrows", 42, 22, 6),
			pickup("ember-niche-heart", "heart", 25, 10),
			pickup("ember-half", "half-ember", 56, 10, 1, {
				guard: "ember-guardian",
			}),
		],
		props: [
			prop("crown", 10, 28),
			prop("torch", 4, 29),
			prop("pillar", 23, 27),
			prop("pillar", 31, 35),
			prop("bell", 49, 9),
			prop("pillar", 42, 8),
			prop("pillar", 57, 22),
			prop("ladder", 56, 10),
			prop("bones", 23, 9),
		],
		tracks: [
			{ kind: "guardian", from: [41, 22], to: [49, 15] },
			{ kind: "snake", from: [24, 31], to: [28, 30] },
		],
		banks: [
			{ id: "ember-west-bevel", a: [41, 12], b: [44, 9] },
			{ id: "ember-east-bevel", a: [55, 20], b: [58, 17] },
		],
		anchors: [
			[9, 32],
			[25, 12],
			[43, 22],
		],
	});
	caves.rime = compile({
		id: "rime",
		name: "The Galeglass Wing",
		subtitle: "V · THE LAST LIGHT",
		width: 66,
		height: 43,
		spawnCell: [7, 31],
		exitCell: [56, 10],
		exitGuard: "rime-guardian",
		reward: "half-rime",
		entrance:
			"One crown half rings softly in your pack. The other answers beyond the frost.",
		rooms: [
			room(
				"rime-threshold",
				"The Bridge of One Bell",
				2,
				25,
				13,
				12,
				"Between-guardian checkpoint and guaranteed resources.",
				"One half is safe. This wing is a new checkpoint. Its spare arrows are yours even with an empty quiver.",
			),
			room(
				"rime-web",
				"The Frosted Thread",
				22,
				25,
				13,
				12,
				"Spider resource reminder and arrow-light scout.",
				"Silver threads turn blue in the cold. Follow them to the last cache.",
			),
			room(
				"rime-arena",
				"The Galeglass Choir",
				40,
				5,
				21,
				21,
				"Alternating breath lanes, safe banks and recovery wounds.",
				"The Galeglass breathes along the marked lane. Move across it, wait for the light to dim, then shoot.",
			),
			room(
				"rime-altar",
				"The Morning Niche",
				22,
				5,
				12,
				12,
				"Optional treasure and relic assembly foreshadowing.",
				"The crown was made for a road, not a throne. Its light belongs to everyone who finds a way home.",
			),
		],
		links: [
			{
				points: [
					[14, 31],
					[22, 31],
				],
			},
			{
				points: [
					[28, 25],
					[28, 15],
				],
			},
			{
				points: [
					[28, 15],
					[40, 15],
				],
			},
			{
				points: [
					[34, 31],
					[50, 31],
				],
			},
			{
				points: [
					[50, 31],
					[50, 25],
				],
			},
		],
		enemies: [
			enemy("rime-spider", "spider", 29, 30, {
				stash: [center(32), center(27)],
			}),
			enemy("rime-guardian", "guardian2", 50, 15, {
				arena: [41, 6, 60, 25],
				name: "The Galeglass",
				hp: 3,
			}),
		],
		pickups: [
			pickup("rime-entry-quiver", "arrows", 10, 30, 12),
			pickup("rime-web-stash", "arrows", 32, 27, 8, { stash: true }),
			pickup("rime-arena-quiver", "arrows", 43, 22, 8),
			pickup("rime-niche-heart", "heart", 25, 10),
			pickup("rime-niche-treasure", "treasure", 28, 8),
			pickup("rime-half", "half-rime", 56, 10, 1, { guard: "rime-guardian" }),
		],
		props: [
			prop("torch", 5, 28),
			prop("cobweb", 32, 26),
			prop("crystal", 25, 7),
			prop("altar", 27, 9),
			prop("pillar", 43, 8),
			prop("pillar", 58, 22),
			prop("bell", 50, 9),
			prop("crown", 56, 10),
			prop("ladder", 56, 10),
		],
		tracks: [
			{ kind: "spider", from: [24, 31], to: [32, 27] },
			{ kind: "guardian", from: [43, 22], to: [50, 15] },
		],
		banks: [
			{ id: "rime-west-bevel", a: [42, 12], b: [45, 9] },
			{ id: "rime-east-bevel", a: [56, 20], b: [59, 17] },
		],
		anchors: [
			[9, 31],
			[25, 12],
			[44, 22],
		],
	});
	const nodes = [
		{
			id: "camp",
			name: "Morrow Camp",
			x: 110,
			y: 338,
			kind: "camp",
			clue: "Reunite the Wayfarer’s Crown. Three arrows. Three reserves. One road home.",
		},
		{
			id: "chalk",
			name: "The Pale Below",
			x: 251,
			y: 316,
			kind: "cave",
			cave: "chalk",
			clue: "Dry stone. Small prints. An axe beneath the mountain.",
		},
		{
			id: "forest",
			name: "Briarwake",
			x: 366,
			y: 245,
			kind: "forest",
			requires: "axe",
			clue: "The old forest opens to the axe.",
		},
		{
			id: "root",
			name: "Root Hollows",
			x: 493,
			y: 295,
			kind: "cave",
			cave: "root",
			clue: "Bright bevels ring true. Something has hoarded a boat.",
		},
		{
			id: "river",
			name: "Foldwater",
			x: 600,
			y: 227,
			kind: "river",
			requires: "boat",
			clue: "Unfold the ferry. Cross once; cross whenever you need.",
		},
		{
			id: "tide",
			name: "Drowned Archive",
			x: 701,
			y: 305,
			kind: "cave",
			cave: "tide",
			clue: "A patient green listener. A brass key in drowned halls.",
		},
		{
			id: "wall",
			name: "The Kingless Wall",
			x: 785,
			y: 181,
			kind: "wall",
			requires: "key",
			clue: "The Index Key still fits the summit gate.",
		},
		{
			id: "summit",
			name: "Crownweather",
			x: 670,
			y: 91,
			kind: "summit",
			cave: "ember",
			clue: "Two wings. Two guardians. Two halves of the morning.",
		},
		{
			id: "spring",
			name: "The Kind Spring",
			x: 229,
			y: 433,
			kind: "spring",
			clue: "Clear water and a ranger’s small reserve. A useful detour.",
		},
		{
			id: "lookout",
			name: "Bellwatch Cairn",
			x: 421,
			y: 128,
			kind: "lookout",
			clue: "The summit bells can be heard even here. An old cache waits.",
		},
	];
	const edges = [
		["camp", "chalk"],
		["camp", "spring"],
		["chalk", "forest", "axe"],
		["forest", "root"],
		["forest", "lookout"],
		["root", "river", "boat"],
		["river", "tide"],
		["tide", "wall", "key"],
		["wall", "summit"],
		["lookout", "river", "boat"],
	].map(([from, to, requires]) => ({ from, to, requires: requires || null }));
	const creatures = {
		rat: {
			hp: 1,
			r: 6,
			speed: 34,
			windup: 0.52,
			attackTime: 0.36,
			recovery: 1.25,
			range: 43,
			hearing: 0.56,
			cue: "scratching",
			caption: "Small claws scratch the stone.",
		},
		snake: {
			hp: 2,
			r: 7,
			speed: 15,
			windup: 0.9,
			attackTime: 0.44,
			recovery: 1.8,
			range: 64,
			hearing: 0.72,
			cue: "hiss",
			caption: "A dry hiss curls around the bend.",
		},
		bat: {
			hp: 1,
			r: 6,
			speed: 40,
			windup: 0.68,
			attackTime: 0.5,
			recovery: 1.4,
			range: 52,
			hearing: 0.35,
			cue: "wings",
			caption: "Wingbeats briefly swallow the quiet.",
		},
		spider: {
			hp: 1,
			r: 7,
			speed: 31,
			windup: 0.8,
			attackTime: 0.4,
			recovery: 1.5,
			range: 40,
			hearing: 0.48,
			cue: "skitter",
			caption: "Thin feet tick against the stone.",
		},
		ooze: {
			hp: 999,
			r: 12,
			speed: 14,
			windup: 1.1,
			attackTime: 0.75,
			recovery: 1.8,
			range: 26,
			hearing: 0.18,
			cue: "ooze",
			caption: "A slow wet drag answers the noise.",
		},
		drake: {
			hp: 2,
			r: 10,
			speed: 20,
			windup: 1.25,
			attackTime: 0.64,
			recovery: 2.1,
			range: 95,
			hearing: 0.65,
			cue: "snore",
			caption: "A heavy snore. Then silence.",
		},
		guardian1: {
			hp: 3,
			r: 19,
			speed: 24,
			windup: 1.4,
			attackTime: 0.9,
			recovery: 2.1,
			range: 165,
			hearing: 0.28,
			cue: "bronze",
			caption: "A bronze note trembles in the dust.",
		},
		guardian2: {
			hp: 3,
			r: 19,
			speed: 14,
			windup: 1.4,
			attackTime: 1.05,
			recovery: 2.1,
			range: 190,
			hearing: 0.5,
			cue: "glass",
			caption: "Glass sings; a pale breath gathers.",
		},
		target: {
			hp: 1,
			r: 9,
			speed: 0,
			windup: 1,
			attackTime: 1,
			recovery: 1,
			range: 0,
			hearing: 999,
			cue: "gong",
			caption: "A brass gong waits beyond the bevel.",
		},
	};
	function validate() {
		const errors = [],
			ids = new Set();
		for (const cave of Object.values(caves)) {
			const valid = (x, y) =>
				cave.rows[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] === ".";
			for (const r of cave.rooms) {
				if (ids.has(r.id)) errors.push(`duplicate ${r.id}`);
				ids.add(r.id);
				if (!r.purpose) errors.push(`missing purpose ${r.id}`);
			}
			for (const e of [...cave.enemies, ...cave.pickups, ...cave.props]) {
				if (ids.has(e.id)) errors.push(`duplicate ${e.id}`);
				ids.add(e.id);
				if (!valid(e.x, e.y)) errors.push(`wall spawn ${e.id}`);
			}
			if (!valid(...cave.spawn) || !valid(cave.exit.x, cave.exit.y))
				errors.push(`bad anchor ${cave.id}`);
			const damage = cave.enemies.reduce(
					(n, e) =>
						n +
						(e.kind === "ooze" || e.kind === "target"
							? 0
							: creatures[e.kind].hp),
					0,
				),
				supply = cave.pickups
					.filter((p) => p.kind === "arrows")
					.reduce((n, p) => n + p.count, 0);
			if (supply < damage + 3)
				errors.push(`insufficient supply ${cave.id} ${supply}/${damage}`);
			const seen = new Set(),
				q = [cave.spawn.map((v) => Math.floor(v / TILE))];
			while (q.length) {
				const [x, y] = q.shift(),
					k = `${x},${y}`;
				if (seen.has(k) || cave.rows[y]?.[x] !== ".") continue;
				seen.add(k);
				q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
			}
			for (const p of [...cave.pickups, { ...cave.exit, id: "exit" }])
				if (!seen.has(`${Math.floor(p.x / TILE)},${Math.floor(p.y / TILE)}`))
					errors.push(`unreachable ${cave.id}/${p.id}`);
		}
		const reached = new Set(["camp"]);
		for (let pass = 0; pass < 10; pass++)
			for (const e of edges) if (reached.has(e.from)) reached.add(e.to);
		if (reached.size !== nodes.length) errors.push("map graph disconnected");
		return errors;
	}
	G.DTContent = {
		version: "dt-expedition-1.0.0",
		tile: TILE,
		caves,
		nodes,
		edges,
		creatures,
		center,
		point,
		validate,
	};
})(globalThis);
