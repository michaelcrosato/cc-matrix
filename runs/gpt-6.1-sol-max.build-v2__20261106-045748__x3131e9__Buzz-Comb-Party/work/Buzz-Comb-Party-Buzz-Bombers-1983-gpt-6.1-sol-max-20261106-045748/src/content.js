(function (B) {
	"use strict";
	const waves = (groups, gap, fast = false) =>
		groups.flatMap((n, g) =>
			Array.from({ length: n }, (_, i) => ({
				id: "w" + g + "-" + i,
				at: 4 + g * gap + i * 1.8,
				kind: fast && (i + g) % 3 === 0 ? "fast" : "worker",
				x: (g + i) % 2 ? 600 : 40,
				dir: (g + i) % 2 ? -1 : 1,
				tier: Math.min(g % 3, 2),
			})),
		);
	B.CONTENT = [
		{
			id: "opening",
			name: "Opening the garden",
			sub: "One can. A very long guest list.",
			palette: ["#102c34", "#214d4b", "#dbb77a"],
			lesson: "Spray a bee. Leave its comb for Pip.",
			gag: 'Pip: "Five stars. Would nibble again."',
			entries: waves([3, 4, 4, 5, 4], 19),
			flowers: [
				[0, 27],
				[613, 640],
			],
			combs: [{ x: 464, tier: 2, red: false, id: "welcome" }],
			speed: 0.85,
			clearBonus: 500,
		},
		{
			id: "express",
			name: "Express delivery",
			sub: "The pale ones did not read the speed limit.",
			palette: ["#183547", "#285563", "#efc780"],
			lesson: "Pale express bees ignore combs. Their red parcels pay more.",
			gag: "Special delivery: absolutely no manners.",
			entries: waves([4, 5, 5, 5, 5], 20, true),
			flowers: [
				[0, 40],
				[600, 640],
			],
			combs: [
				{ x: 190, tier: 1, red: false, id: "lane-a" },
				{ x: 440, tier: 3, red: false, id: "lane-b" },
			],
			speed: 1,
			clearBonus: 700,
		},
		{
			id: "wax",
			name: "Wax works",
			sub: "A tiny corner office. Excellent benefits.",
			palette: ["#26334d", "#405062", "#e5b86f"],
			lesson: "That pocket is too snug. Give the worker a second to build!",
			gag: "The union demands a bigger corner office.",
			entries: [
				{ id: "builder", at: 3, kind: "worker", x: 43, dir: 1, tier: 3 },
				...waves([4, 5, 5, 6, 5], 20, true),
			],
			flowers: [
				[0, 36],
				[602, 640],
			],
			combs: [
				{ x: 72, tier: 3, red: false, id: "pocket-a" },
				{ x: 72, tier: 4, red: false, id: "pocket-b" },
			],
			pocket: [28, 60, 3],
			speed: 1.03,
			clearBonus: 900,
		},
		{
			id: "traffic",
			name: "Flower traffic",
			sub: "Please mind the enthusiastic petunias.",
			palette: ["#323452", "#526054", "#efc296"],
			lesson: "Flowers take space, not health. A spring-hop finds safe ground.",
			gag: "The flowers have accepted your parking appeal.",
			entries: waves([5, 5, 6, 6, 6], 19, true),
			flowers: [
				[0, 84],
				[556, 640],
			],
			growth: [
				{ at: 20, x0: 287, x1: 353 },
				{ at: 55, x0: 84, x1: 129 },
			],
			combs: [],
			speed: 1.08,
			clearBonus: 1000,
		},
		{
			id: "rehearsal",
			name: "Pageant rehearsal",
			sub: "Pip has been promoted to shield inspector.",
			palette: ["#40324d", "#64505a", "#f4c985"],
			lesson: "Feed Pip a RED comb to open the bud. Then spray the open bud!",
			gag: 'Pip: "Your shield tastes like strawberries."',
			entries: waves([4, 5, 5, 5, 4], 19, true),
			flowers: [
				[0, 65],
				[575, 640],
			],
			combs: [],
			boss: { phases: 1, hp: 5, exposure: 14, supply: 11 },
			speed: 1.05,
			clearBonus: 1200,
		},
		{
			id: "finale",
			name: "The garden-party finale",
			sub: "Her Majesty, Queen of the Uninvited.",
			palette: ["#30274b", "#4d4863", "#ffd384"],
			lesson:
				"Three shield buds. Red harvests open them. Make every spritz count.",
			gag: 'Pip: "Lovely party. I ate the security system."',
			entries: waves([5, 5, 6, 6, 5], 20, true),
			flowers: [
				[0, 55],
				[585, 640],
			],
			growth: [{ at: 48, x0: 300, x1: 340 }],
			combs: [],
			boss: { phases: 3, hp: 6, exposure: 15, supply: 10 },
			speed: 1.12,
			clearBonus: 2500,
		},
	];
	B.validateContent = function (data) {
		if (!Array.isArray(data) || !data.length || data.length > 12)
			throw Error("Content needs 1–12 encounters.");
		const ids = new Set();
		for (const e of data) {
			if (
				!e ||
				typeof e.id !== "string" ||
				ids.has(e.id) ||
				typeof e.name !== "string" ||
				e.name.length > 60
			)
				throw Error("Each encounter needs a unique id and short name.");
			ids.add(e.id);
			if (
				!Array.isArray(e.entries) ||
				e.entries.length > 100 ||
				!Array.isArray(e.flowers) ||
				!Array.isArray(e.combs)
			)
				throw Error("Entries, flowers and combs must be arrays.");
			if (
				!Array.isArray(e.palette) ||
				e.palette.length !== 3 ||
				!e.palette.every((c) => /^#[0-9a-f]{6}$/i.test(c))
			)
				throw Error("Palette needs three hex colors.");
			if (
				!(e.speed >= 0.3 && e.speed <= 3) ||
				!Number.isFinite(e.clearBonus) ||
				e.clearBonus < 0 ||
				e.clearBonus > 10000
			)
				throw Error("Invalid speed or score rule.");
			const seen = new Set();
			for (const a of e.entries) {
				if (
					!a ||
					typeof a.id !== "string" ||
					seen.has(a.id) ||
					!["worker", "fast"].includes(a.kind) ||
					!Number.isFinite(a.at) ||
					a.at < 0 ||
					a.at > 600 ||
					!Number.isFinite(a.x) ||
					a.x < 28 ||
					a.x > 612 ||
					!Number.isInteger(a.tier) ||
					a.tier < 0 ||
					a.tier > 6 ||
					![-1, 1].includes(a.dir)
				)
					throw Error("Invalid bee entry in " + e.id);
				seen.add(a.id);
			}
			for (const f of [
				...e.flowers,
				...(e.growth || []).map((g) => [g.x0, g.x1]),
			])
				if (
					!Array.isArray(f) ||
					f.length !== 2 ||
					!f.every(Number.isFinite) ||
					f[0] < 0 ||
					f[1] > 640 ||
					f[1] <= f[0]
				)
					throw Error("Invalid flower interval.");
			for (const g of e.growth || [])
				if (!Number.isFinite(g.at) || g.at < 0 || g.at > 600)
					throw Error("Invalid growth time.");
			for (const c of e.combs)
				if (
					!Number.isFinite(c.x) ||
					c.x < 28 ||
					c.x > 612 ||
					!Number.isInteger(c.tier) ||
					c.tier < 0 ||
					c.tier > 6 ||
					typeof c.red !== "boolean" ||
					typeof c.id !== "string"
				)
					throw Error("Invalid comb.");
			if (
				e.boss &&
				(!Number.isInteger(e.boss.phases) ||
					e.boss.phases < 1 ||
					e.boss.phases > 3 ||
					!Number.isInteger(e.boss.hp) ||
					e.boss.hp < 1 ||
					e.boss.hp > 30 ||
					!(e.boss.exposure >= 5 && e.boss.exposure <= 30) ||
					!(e.boss.supply >= 3 && e.boss.supply <= 30))
			)
				throw Error("Invalid shield phase.");
		}
		return JSON.parse(JSON.stringify(data));
	};
})((globalThis.BCP = globalThis.BCP || {}));
