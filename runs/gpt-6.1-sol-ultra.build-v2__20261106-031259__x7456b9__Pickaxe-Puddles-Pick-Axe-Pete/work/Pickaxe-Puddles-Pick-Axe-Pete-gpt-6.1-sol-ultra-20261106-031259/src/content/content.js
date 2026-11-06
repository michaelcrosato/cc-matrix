(() => {
	globalThis.PP ||= {};
	const PP = globalThis.PP;
	PP.TUNING = {
		moveSpeed: {
			label: "Run speed",
			value: 105,
			min: 55,
			max: 165,
			step: 5,
			unit: "u/s",
		},
		climbSpeed: {
			label: "Climb speed",
			value: 78,
			min: 35,
			max: 130,
			step: 5,
			unit: "u/s",
		},
		jumpSpeed: {
			label: "Jump strength",
			value: 285,
			min: 180,
			max: 400,
			step: 5,
			unit: "u/s",
		},
		gravity: {
			label: "Gravity",
			value: 800,
			min: 450,
			max: 1200,
			step: 25,
			unit: "u/s²",
		},
		chopCycle: {
			label: "Chop cadence",
			value: 0.32,
			min: 0.2,
			max: 0.65,
			step: 0.02,
			unit: "s",
		},
		redirectWindow: {
			label: "Redirect window",
			value: 0.14,
			min: 0.08,
			max: 0.32,
			step: 0.02,
			unit: "s",
		},
		durability: {
			label: "Pick contacts",
			value: 6,
			min: 2,
			max: 12,
			step: 1,
			unit: "",
		},
		rockSpeed: {
			label: "Ore speed",
			value: 58,
			min: 25,
			max: 120,
			step: 5,
			unit: "u/s",
		},
		spawnInterval: {
			label: "Door interval",
			value: 5.8,
			min: 2.4,
			max: 12,
			step: 0.2,
			unit: "s",
		},
		pressure: {
			label: "Pressure gain",
			value: 0.035,
			min: 0,
			max: 0.1,
			step: 0.005,
			unit: "",
		},
		keyLifetime: {
			label: "Key lifetime",
			value: 37,
			min: 18,
			max: 75,
			step: 1,
			unit: "s",
		},
		pickLifetime: {
			label: "Pick lifetime",
			value: 32,
			min: 15,
			max: 75,
			step: 1,
			unit: "s",
		},
		ladderPeriod: {
			label: "Ladder cycle",
			value: 23,
			min: 12,
			max: 40,
			step: 1,
			unit: "s",
		},
		rescueTime: {
			label: "Rescue hold",
			value: 1.8,
			min: 0.5,
			max: 4,
			step: 0.1,
			unit: "s",
		},
		recoveryWait: {
			label: "Supply recovery",
			value: 8,
			min: 4,
			max: 14,
			step: 1,
			unit: "s",
		},
	};
	PP.defaults = () =>
		Object.fromEntries(Object.entries(PP.TUNING).map(([k, v]) => [k, v.value]));
	PP.validTuning = (given = {}) => {
		const result = PP.defaults();
		for (const [key, spec] of Object.entries(PP.TUNING)) {
			if (Number.isFinite(given[key]))
				result[key] = Math.max(spec.min, Math.min(spec.max, given[key]));
			if (key === "durability") result[key] = Math.round(result[key]);
		}
		return result;
	};
	PP.PALETTES = {
		amber: ["#091d22", "#163539", "#1f3c3b"],
		cyan: ["#061c25", "#102e3b", "#173b40"],
		violet: ["#1a1926", "#26313c", "#303c3c"],
	};
	PP.CHAMBERS = [
		{
			id: "intake",
			name: "The Intake",
			subtitle: "Every fortune starts with a little bad judgment.",
			tiers: 5,
			palette: "amber",
			gaps: [
				[208, 240],
				[352, 384],
				[192, 224],
				[384, 416],
			],
			patterns: ["normal", "normal", "bounce"],
			deck: ["pick", "key", "gold", "pick", "gold", "key"],
			target: 7,
		},
		{
			id: "crosscurrent",
			name: "Crosscurrent",
			subtitle: "The rocks have learned to take shortcuts.",
			tiers: 6,
			palette: "cyan",
			gaps: [
				[304, 336],
				[192, 224],
				[352, 384],
				[208, 240],
				[320, 352],
			],
			patterns: ["bounce", "normal", "heavy", "bounce"],
			deck: ["gold", "pick", "key", "gold", "pick", "key"],
			target: 10,
		},
		{
			id: "deep",
			finale: {
				waves: 3,
				clearsPerWave: 5,
				keyClears: 4,
				collisions: 3,
				timeout: 32,
			},
			name: "The Motherlode",
			subtitle: "Three bells. One last spectacular payday.",
			tiers: 7,
			palette: "violet",
			gaps: [
				[240, 272],
				[320, 352],
				[208, 240],
				[352, 384],
				[192, 224],
				[304, 336],
			],
			patterns: ["heavy", "bounce", "normal", "heavy"],
			deck: ["pick", "gold", "key", "pick", "gold", "key"],
			target: 14,
		},
	];
	PP.ROUTES = [
		{
			id: "sun",
			name: "SUN",
			symbol: "sun",
			color: "#ffbf66",
			bonus: "Steady rolling lanes",
			speed: 0.9,
			layout: "original",
			ore: ["normal", "normal", "bounce", "heavy"],
		},
		{
			id: "moon",
			name: "MOON",
			symbol: "moon",
			color: "#6ce2de",
			bonus: "Bouncing ore, richer seams",
			speed: 1,
			layout: "mirror",
			ore: ["bounce", "bounce", "normal", "bounce", "heavy"],
		},
		{
			id: "star",
			name: "STAR",
			symbol: "star",
			color: "#ed8fa5",
			bonus: "Heavy ore, bigger collision bonus",
			speed: 1.08,
			layout: "stagger",
			ore: ["heavy", "heavy", "normal", "bounce", "heavy"],
		},
	];
	PP.makeRoom = (index, route = 0) => {
		const data = PP.CHAMBERS[index],
			variant = PP.ROUTES[route];
		const gaps = data.gaps.map(([a, b], i) =>
			variant.layout === "mirror"
				? [576 - b, 576 - a]
				: variant.layout === "stagger"
					? [...data.gaps[(i + 1) % data.gaps.length]]
					: [a, b],
		);
		const floors = Array.from({ length: data.tiers }, (_, i) => ({
			z: 16 + i * 64,
			gaps: i === 0 ? [] : [gaps[i - 1]],
		}));
		const ladders = [];
		for (let i = 0; i < data.tiers - 1; i++) {
			for (const x of [104, 456])
				ladders.push({
					id: `ladder-${i}-${x}`,
					x,
					z0: floors[i].z,
					z1: floors[i + 1].z,
					temporary: false,
					state: "usable",
				});
			const options = i % 2 ? [360, 216, 280] : [216, 360, 280];
			const shortcutX = options.find(
				(x) =>
					![floors[i], floors[i + 1]].some((f) =>
						f.gaps.some(([a, b]) => x > a - 12 && x < b + 12),
					),
			);
			ladders.push({
				id: `shortcut-${i}`,
				x: shortcutX,
				z0: floors[i].z,
				z1: floors[i + 1].z,
				temporary: true,
				state: "inactive",
				offset: i * 3.2,
			});
		}
		return {
			...data,
			index,
			route,
			floors,
			ladders,
			routeColor: variant.color,
			patterns: index === 0 || route === 0 ? data.patterns : variant.ore,
			doors: PP.ROUTES.map((r, i) => ({
				...r,
				id: r.id,
				x: [48, 528, 288][i],
				z: floors[[0, Math.min(2, data.tiers - 1), data.tiers - 1][i]].z,
				warning: 0,
			})),
		};
	};
	// ASCII is top-first, cell/set are bottom-first. Kept in one adapter.
	PP.makeLevel = (room) => {
		const E = globalThis.My3D2dge,
			height = room.tiers * 4 + 3,
			rows = Array.from({ length: height }, () => Array(36).fill("."));
		for (const floor of room.floors)
			for (let x = 0; x < 36; x++) {
				const wx = x * 16 + 8;
				if (!floor.gaps.some(([a, b]) => wx >= a && wx < b))
					rows[height - floor.z / 16][x] = "#";
			}
		return new E.PlatformMap({
			rows: rows.map((r) => r.join("")),
			legend: { "#": 1 },
			types: {
				1: { kind: "oneway", style: "wood", top: "#ba935d", side: "#4b3830" },
				2: { kind: "ladder", color: "#e7c38a" },
			},
			edges: "solid",
		});
	};
})();
