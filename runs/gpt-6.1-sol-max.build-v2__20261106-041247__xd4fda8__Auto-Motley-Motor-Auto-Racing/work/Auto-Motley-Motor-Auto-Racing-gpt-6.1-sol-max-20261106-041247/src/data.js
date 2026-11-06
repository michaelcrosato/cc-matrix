/* Original game data. Coordinates are world units; +x east, +y south. */
globalThis.MM = {};
((M) => {
	M.VERSION = "1.0.0";
	M.PHYSICS = "amm-1";
	M.PROTOCOL = "amm-duel-1";
	M.DT = 1 / 120;
	M.TITLE = "Auto Motley Motor";
	M.DEFAULTS = Object.freeze({
		speed: 1,
		accel: 1,
		brake: 1,
		steer: 1,
		roadGrip: 1,
		grassGrip: 0.66,
		gravelGrip: 0.43,
		crash: 72,
		ai: 1,
		lead: 264,
		target: 10,
	});
	const matched = Object.freeze({
		top: 186,
		accel: 37,
		brake: 155,
		turn: 2.05,
		grip: 6.2,
	});
	M.CARS = [
		{
			id: "white",
			name: "Milk Float",
			color: "#fff4d8",
			stripe: "#ed7045",
			profile: "precision",
			physics: { top: 114, accel: 35, brake: 160, turn: 2.85, grip: 11 },
			bars: [3, 3, 10],
			about: "Easy does it. Gentle speed, lovely cornering.",
		},
		{
			id: "green",
			name: "Peas Please",
			color: "#74c76b",
			stripe: "#e9efb6",
			profile: "sprinter",
			physics: { top: 134, accel: 70, brake: 163, turn: 2.6, grip: 9.3 },
			bars: [5, 10, 8],
			about: "First off the mark, first back on the road.",
		},
		{
			id: "red",
			name: "Tomato Tempo",
			color: "#f3684e",
			stripe: "#ffe8ad",
			profile: "balanced",
			physics: { top: 155, accel: 52, brake: 160, turn: 2.4, grip: 8 },
			bars: [7, 7, 7],
			about: "A little zip. A little grip. A proper all-rounder.",
		},
		{
			id: "tan",
			name: "Biscuit Bullet",
			color: "#d8b57f",
			stripe: "#773d2b",
			profile: "tourer",
			physics: matched,
			bars: [10, 3, 5],
			about: "Long legs, wide turns. Plan the next bend.",
		},
		{
			id: "blue",
			name: "Blue By You",
			color: "#77bfe3",
			stripe: "#fff1c6",
			profile: "tourer",
			physics: matched,
			bars: [10, 3, 5],
			about: "Biscuit’s mechanical twin. Let the driving decide.",
		},
	];
	const meadow = [
		[760, 1680],
		[1210, 1680],
		[1640, 1630],
		[1880, 1420],
		[1900, 1100],
		[1730, 820],
		[1410, 740],
		[1020, 760],
		[720, 900],
		[570, 1180],
		[590, 1480],
	];
	const orchard = [
		[2470, 1490],
		[2640, 1210],
		[2950, 1000],
		[3250, 1090],
		[3460, 850],
		[3740, 940],
		[3910, 1270],
		[3740, 1500],
		[3450, 1580],
		[3280, 1870],
		[2910, 1930],
		[2590, 1790],
	];
	const lake = [
		[800, 2980],
		[910, 2660],
		[1240, 2510],
		[1600, 2530],
		[1810, 2700],
		[1880, 3010],
		[2070, 3280],
		[1950, 3610],
		[1590, 3750],
		[1240, 3610],
		[1030, 3360],
		[750, 3260],
	];
	const forest = [
		[3220, 3260],
		[3280, 2810],
		[3520, 2590],
		[3890, 2640],
		[4200, 2860],
		[4520, 2820],
		[4780, 2990],
		[4780, 3250],
		[4540, 3380],
		[4390, 3600],
		[4550, 3860],
		[4250, 4090],
		[3890, 4140],
		[3530, 3910],
		[3350, 3610],
	];
	M.COURSE_DATA = [
		{
			id: "meadow",
			name: "Clover Club",
			sub: "The gentle art of taking a turn",
			landmark: "The little red paddock",
			color: "#eed899",
			region: "MEADOW",
			width: 66,
			medal: [47, 60, 85],
			points: meadow,
			gates: 12,
			version: 1,
		},
		{
			id: "orchard",
			name: "Orchard Shuffle",
			sub: "Link the bends. Keep your rhythm.",
			landmark: "Apple barn & windmill",
			color: "#f0b46f",
			region: "ORCHARD",
			width: 60,
			medal: [52, 70, 96],
			points: orchard,
			gates: 14,
			version: 1,
		},
		{
			id: "lake",
			name: "Puddle Parade",
			sub: "A cool head beside deep water",
			landmark: "Bluebell lake causeway",
			color: "#8fd5df",
			region: "LAKESIDE",
			width: 54,
			medal: [55, 73, 100],
			points: lake,
			gates: 14,
			version: 1,
		},
		{
			id: "forest",
			name: "Pine & Dandy",
			sub: "Fast sweeps. One very slow hairpin.",
			landmark: "Lookout lodge",
			color: "#b0ca84",
			region: "WOODLAND",
			width: 58,
			medal: [63, 82, 110],
			points: forest,
			gates: 16,
			version: 1,
		},
		{
			id: "grand",
			name: "Motley County",
			sub: "The big one. All your tricks, please.",
			landmark: "The old observatory",
			color: "#d3b2df",
			region: "COUNTY GRAND TOUR",
			width: 60,
			medal: [115, 145, 190],
			points: [
				[760, 1680],
				[1210, 1680],
				[1640, 1630],
				[1880, 1420],
				[2210, 1430],
				[2470, 1490],
				[2640, 1210],
				[2950, 1000],
				[3250, 1090],
				[3460, 850],
				[3740, 940],
				[4160, 830],
				[4600, 650],
				[5090, 850],
				[5440, 1210],
				[5550, 1690],
				[5380, 2090],
				[5530, 2470],
				[5280, 2780],
				[4780, 2990],
				[4780, 3250],
				[4540, 3380],
				[4390, 3600],
				[4550, 3860],
				[4250, 4090],
				[3890, 4140],
				[3530, 3910],
				[3130, 3840],
				[2730, 3970],
				[2310, 3900],
				[1950, 3610],
				[1590, 3750],
				[1240, 3610],
				[1030, 3360],
				[750, 3260],
				[620, 2880],
				[750, 2500],
				[620, 2090],
			],
			gates: 30,
			version: 1,
		},
	];
	M.CONNECTORS = [
		{
			id: "farm-link",
			points: [
				[1880, 1420],
				[2180, 1430],
				[2470, 1490],
			],
			width: 48,
		},
		{
			id: "lake-link",
			points: [
				[1210, 1680],
				[1350, 2070],
				[1240, 2510],
			],
			width: 48,
		},
		{
			id: "pine-link",
			points: [
				[3280, 1870],
				[3220, 2210],
				[3520, 2590],
			],
			width: 48,
		},
		{
			id: "south-link",
			points: [
				[2070, 3280],
				[2500, 3430],
				[2920, 3320],
				[3220, 3260],
			],
			width: 48,
		},
		{
			id: "old-airfield",
			points: [
				[4250, 4090],
				[4440, 4320],
				[4720, 4480],
				[4960, 4480],
			],
			width: 42,
		},
		{
			id: "straight",
			points: [
				[4960, 4480],
				[4340, 4480],
				[3700, 4480],
				[3050, 4480],
				[2400, 4480],
			],
			width: 48,
		},
	];
	// Grand course is assembled from exact shared road edges and three authored links.
	// Endpoints are coordinates of control points on the referenced road, not global-nearest progress rules.
	M.COURSE_DATA[4].pieces = [
		{ road: "meadow", from: [760, 1680], to: [1880, 1420] },
		{ road: "farm-link" },
		{ road: "orchard", from: [2470, 1490], to: [3910, 1270] },
		{
			via: [
				[3910, 1270],
				[4160, 830],
				[4600, 650],
				[5090, 850],
				[5440, 1210],
				[5550, 1690],
				[5380, 2090],
				[5530, 2470],
				[5280, 2780],
				[4780, 2990],
			],
		},
		{ road: "forest", from: [4780, 2990], to: [3530, 3910] },
		{
			via: [
				[3530, 3910],
				[3130, 3840],
				[2730, 3970],
				[2310, 3900],
				[1950, 3610],
			],
		},
		{ road: "lake", from: [1950, 3610], to: [750, 3260] },
		{
			via: [
				[750, 3260],
				[620, 2880],
				[750, 2500],
				[620, 2090],
				[590, 1480],
			],
		},
		{ road: "meadow", from: [590, 1480], to: [760, 1680] },
	];
	M.COURSE_DATA[4].start = [5090, 850];
	M.WATER = [
		{ x: 1570, y: 3050, rx: 270, ry: 380 },
		{ x: 2180, y: 3010, rx: 245, ry: 310 },
		{ x: 4350, y: 1860, rx: 230, ry: 170 },
	];
	M.BUILDINGS = [
		{
			id: "paddock",
			x: 1120,
			y: 1515,
			shape: "paddock",
			r: 37,
			label: "CLOVER CLUB",
		},
		{
			id: "barn",
			x: 3040,
			y: 1350,
			shape: "barn",
			r: 50,
			label: "APPLE & CO.",
		},
		{
			id: "mill",
			x: 3500,
			y: 1190,
			shape: "mill",
			r: 25,
			label: "ORCHARD MILL",
		},
		{
			id: "boathouse",
			x: 1390,
			y: 3480,
			shape: "boathouse",
			r: 31,
			label: "BLUEBELL LAKE",
		},
		{
			id: "lodge",
			x: 3830,
			y: 2870,
			shape: "lodge",
			r: 45,
			label: "PINE LODGE",
		},
		{
			id: "observatory",
			x: 4940,
			y: 1220,
			shape: "observatory",
			r: 42,
			label: "MOTLEY OBSERVATORY",
		},
		{
			id: "hangar",
			x: 4900,
			y: 4330,
			shape: "hangar",
			r: 48,
			label: "OLD AIRFIELD",
		},
	];
	M.TOUR = [
		{
			id: "lesson",
			title: "A light foot, a lovely line",
			course: 0,
			car: 0,
			mode: "lesson",
			text: "Welcome to Motley County! Release the brake to go. Brake before a bend; steer gently. First, show the crew a proper stop.",
			goal: "stop",
		},
		{
			id: "lap",
			title: "A lap for the scrapbook",
			course: 0,
			car: 0,
			mode: "trial",
			laps: 1,
			text: "Now follow the chevrons through every gate. Grass slows you, gravel slides you. Hold Recover if you lose your way. A recovery adds 5 seconds.",
		},
		{
			id: "orchard",
			title: "Finding your rhythm",
			course: 1,
			car: 1,
			mode: "trial",
			laps: 1,
			text: "Peas Please jumps off the line! Brake early, let the car settle, then release through the next bend. Every gate must be crossed forward.",
		},
		{
			id: "water",
			title: "The splash test",
			course: 2,
			car: 2,
			mode: "lesson",
			goal: "water",
			text: "The blue stuff is deep! Follow the practice arrow into the marked pond, then hold Recover. A splash or a hard impact counts as a crash.",
		},
		{
			id: "precision",
			title: "Puddle middle, please",
			course: 2,
			car: 2,
			mode: "trial",
			laps: 1,
			text: "Keep your tyres on that causeway! A skid is just a skid; water and hard solid impacts are crashes. Your next gate is always on the map.",
		},
		{
			id: "explore",
			title: "The road between",
			course: 2,
			car: 1,
			mode: "explore",
			text: "Take the signed eastbound lane to Pine Lodge. The roads really do join up. Your passport remembers every circuit entrance you find.",
		},
		{
			id: "forest",
			title: "Pine for the finish",
			course: 3,
			car: 3,
			mode: "trial",
			laps: 1,
			text: "Biscuit Bullet has long legs. Ease off early for the hairpin. Gravel shoulders need a gentle hand; there is no prize for mowing the lawn!",
		},
		{
			id: "lead",
			title: "A little friendly pressure",
			course: 0,
			car: 2,
			mode: "lesson",
			goal: "lead",
			text: "Pull twelve car lengths ahead of the pace car for 1 point. Contact changes your line, but never scores. Both cars restart at the leader’s last gate.",
		},
		{
			id: "crash",
			title: "Mind the other fellow",
			course: 0,
			car: 2,
			mode: "lesson",
			goal: "crash",
			text: "Hold Recover to try a deliberate crash. Your opponent receives 2 points. Two crashes together score nothing; a crash always takes priority over a lead.",
		},
		{
			id: "duel",
			title: "The county challenge",
			course: 1,
			car: 2,
			mode: "duel",
			text: "Put it together! First to 10 points, or the leader when three minutes are up. Pressure the pace car, keep it clean, and make every bend count.",
		},
		{
			id: "grand",
			title: "The long way home",
			course: 4,
			car: 4,
			mode: "trial",
			laps: 1,
			text: "One last lap across the county. Blue By You drives exactly like Biscuit. You know these roads now. Bring it home!",
		},
	];
	M.validateData = () => {
		const problems = [],
			ids = new Set();
		for (const c of M.COURSE_DATA) {
			if (
				ids.has(c.id) ||
				!c.name ||
				(!c.pieces && (!c.points || c.points.length < 6)) ||
				c.width < 40 ||
				c.gates < 4
			)
				problems.push("Invalid circuit " + c.id);
			ids.add(c.id);
			if (
				!c.pieces &&
				!c.points?.every((p) => p.length === 2 && p.every(Number.isFinite))
			)
				problems.push("Invalid control point " + c.id);
			if (
				c.pieces &&
				!c.pieces.every((p) =>
					p.via
						? p.via.length >= 2 &&
							p.via.every((q) => q.length === 2 && q.every(Number.isFinite))
						: [...M.COURSE_DATA.filter((r) => !r.pieces), ...M.CONNECTORS].some(
								(r) => r.id === p.road,
							),
				)
			)
				problems.push("Invalid shared road edge " + c.id);
		}
		if (JSON.stringify(M.CARS[3].physics) !== JSON.stringify(M.CARS[4].physics))
			problems.push("Matched profiles differ");
		if (!M.TOUR.every((t) => M.COURSE_DATA[t.course] && M.CARS[t.car]))
			problems.push("Invalid tour reference");
		return problems;
	};
})(MM);
