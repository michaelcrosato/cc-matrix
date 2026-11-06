export const U = 16;
export const HOME = {
	id: "home",
	name: "Larkspur Field",
	x: 2500 * U,
	y: 12000 * U,
	z: 8 * U,
};
export const OPERATION = {
	id: "tidemark",
	name: "Operation Tidemark",
	deadline: 720,
	cruiseAltitude: 850 * U,
	wind: [2.2 * U, -1.3 * U],
	targets: [
		{
			id: "harbor",
			name: "Kestrel Shipyard",
			x: 23500 * U,
			y: 12000 * U,
			kind: "harbor",
			primary: true,
			description:
				"Disable two military components. The docked escort, fuel stores and assembly hall are valid targets.",
			parts: [
				{
					id: "escort",
					kind: "ship",
					dx: -80 * U,
					dy: 0,
					r: 95 * U,
					hp: 1,
					points: 1800,
				},
				{
					id: "hall",
					kind: "warehouse",
					dx: 100 * U,
					dy: 90 * U,
					r: 100 * U,
					hp: 1.5,
					points: 1300,
				},
				{
					id: "stores",
					kind: "tanks",
					dx: 140 * U,
					dy: -120 * U,
					r: 80 * U,
					hp: 1,
					points: 1000,
				},
			],
		},
		{
			id: "battery",
			name: "Needle Point Battery",
			x: 15400 * U,
			y: 12600 * U,
			kind: "battery",
			description:
				"Optional: silence the coastal barrage. A wide dogleg reduces exposure.",
			parts: [
				{
					id: "guns",
					kind: "battery",
					dx: 0,
					dy: 0,
					r: 95 * U,
					hp: 1,
					points: 800,
				},
			],
		},
		{
			id: "refinery",
			name: "Cinder Works",
			x: 25700 * U,
			y: 14500 * U,
			kind: "refinery",
			description:
				"Optional: strike inland fuel tanks. Check return reserve before committing.",
			parts: [
				{
					id: "tanks",
					kind: "tanks",
					dx: 0,
					dy: 0,
					r: 110 * U,
					hp: 1.3,
					points: 1500,
				},
				{
					id: "plant",
					kind: "warehouse",
					dx: 140 * U,
					dy: 80 * U,
					r: 100 * U,
					hp: 1.5,
					points: 1200,
				},
			],
		},
	],
	routes: {
		direct: {
			label: "Direct • defended coast",
			points: [
				[11000 * U, 12000 * U],
				[23500 * U, 12000 * U],
			],
		},
		dogleg: {
			label: "Dogleg • lower exposure",
			points: [
				[11000 * U, 8200 * U],
				[15600 * U, 8800 * U],
				[23500 * U, 12000 * U],
			],
		},
	},
	waves: [
		{
			id: "nose",
			minX: 6500 * U,
			maxTime: 100,
			bearing: 0,
			pattern: "head-on",
			count: 2,
		},
		{
			id: "starboard",
			minX: 11500 * U,
			maxTime: 185,
			bearing: 1,
			pattern: "crossing",
			count: 2,
		},
		{
			id: "port",
			minX: 17500 * U,
			maxTime: 280,
			bearing: 3,
			pattern: "crossing",
			count: 2,
		},
		{ id: "tail", returning: true, bearing: 2, pattern: "pursuit", count: 3 },
	],
};
export const LOADOUTS = [
	{
		name: "Long legs",
		bombs: 6,
		fuel: 100,
		detail: "6 bombs · 100% fuel · largest reserve",
	},
	{
		name: "Balanced",
		bombs: 10,
		fuel: 93,
		detail: "10 bombs · 93% fuel · recommended",
	},
	{
		name: "Heavy parcel",
		bombs: 14,
		fuel: 84,
		detail: "14 bombs · 84% fuel · two targets",
	},
];
export const DIFFICULTIES = [
	{ name: "Cadet", accuracy: 0.6, fuel: 0.8, aim: 0.075, damage: 0.7 },
	{ name: "Crew", accuracy: 1, fuel: 1, aim: 0.045, damage: 1 },
	{ name: "Veteran", accuracy: 1.3, fuel: 1.1, aim: 0.026, damage: 1.2 },
];
export const STATIONS = [
	{
		id: "pilot",
		name: "Pilot",
		short: "FLIGHT DECK",
		angle: 0,
		offset: [7, 0, 2.3],
	},
	{
		id: "nose",
		name: "12 o’clock",
		short: "NOSE GUN",
		angle: 0,
		offset: [12, 0, -0.1],
		arc: 0.95,
	},
	{
		id: "starboard",
		name: "3 o’clock",
		short: "STARBOARD GUN",
		angle: Math.PI / 2,
		offset: [-1, 2, 0.2],
		arc: 0.9,
	},
	{
		id: "tail",
		name: "6 o’clock",
		short: "TAIL GUN",
		angle: Math.PI,
		offset: [-12, 0, 0.4],
		arc: 0.9,
	},
	{
		id: "port",
		name: "9 o’clock",
		short: "PORT GUN",
		angle: -Math.PI / 2,
		offset: [-1, -2, 0.2],
		arc: 0.9,
	},
	{
		id: "bombs",
		name: "Bombardier",
		short: "DOWNWARD SIGHT",
		angle: 0,
		offset: [9, 0, -1.3],
	},
];
export const DEFAULT_BALANCE = {
	flightResponse: 1,
	holdStrength: 1,
	fuelBurn: 1,
	enemyAccuracy: 1,
	flakWindow: 4.5,
	aimHelp: 1,
	bombDrift: 1,
	damage: 1,
};
export const BALANCE_ROWS = [
	["flightResponse", "Flight response ×", 0.4, 2, 0.05],
	["holdStrength", "Course hold ×", 0.2, 2, 0.05],
	["fuelBurn", "Fuel consumption ×", 0, 2, 0.05],
	["enemyAccuracy", "Enemy accuracy ×", 0, 2, 0.05],
	["flakWindow", "Flak warning · seconds", 2, 8, 0.25],
	["aimHelp", "Gun aim help ×", 0, 2, 0.1],
	["bombDrift", "Wind / bomb drift ×", 0, 2, 0.1],
	["damage", "Damage multiplier ×", 0, 3, 0.1],
];
