/* Original authored content for Beauty and the Tall Tale. */
(() => {
	const TT = (globalThis.TallTale = globalThis.TallTale || globalThis.TT || {});
	globalThis.TT = TT;
	TT.DEFAULTS = Object.freeze({
		run: 95,
		jump: 200,
		gravity: 1000,
		climbTime: 0.72,
		windowOpen: 6.2,
		windowWarning: 1.1,
		hazardCadence: 1,
		hazardSpeed: 1,
		heartDuration: 6,
	});
	const W = (prefix, floor, xs, delay = 0) =>
		xs.map((x, order) => ({
			id: `${prefix}-window-${floor}-${order}`,
			floor,
			x,
			z: 16 + floor * 48,
			toZ: 64 + floor * 48,
			order,
			delay,
		}));
	const H = (id, type, floor, after, side = 1, extra = {}) => ({
		id,
		type,
		floor,
		after,
		side,
		telegraph: 1.15,
		repeat: 16,
		speed:
			type === "rat" ? 32 : type === "bird" ? 58 : type === "bat" ? 46 : 40,
		...extra,
	});
	const Heart = (id, floor, x, after = 1.2, extra = {}) => ({
		id,
		floor,
		x,
		after,
		repeat: 10,
		life: 12,
		...extra,
	});
	TT.CONTENT = {
		version: 1,
		width: 320,
		floorHeight: 48,
		baseZ: 16,
		chanceCap: 5,
		score: {
			heart: 50,
			smash: 50,
			section: 100,
			rescue: 500,
			clean: 25,
			team: 25,
		},
		sections: [
			{
				id: "street",
				name: "The Mutton Building",
				subtitle: "A SMALL FELLOW. A VERY TALL PROBLEM.",
				inset: 0,
				floors: 4,
				exitX: 248,
				startX: 48,
				palette: {
					brick: "#b76e5b",
					shadow: "#74434e",
					trim: "#ead7a4",
					sky: "#365a70",
				},
				banner: "SMALL FELLA. BIG AMBITION.",
				line: "Hank: I eat stairs for breakfast!",
				windows: [
					...W("street", 0, [88, 232], 0),
					...W("street", 1, [244, 88], 10),
					...W("street", 2, [92, 228], 23),
					...W("street", 3, [232, 88], 37),
				],
				bumpers: [{ id: "street-bumper", x: 290, floor: 3, mode: "reverse" }],
				spawns: [
					H("first-stone", "boulder", 0, 5.5, 1, { speed: 32, repeat: 20 }),
					H("first-rat", "rat", 1, 0.3, -1),
					H("rush-stone", "boulder", 1, 3.0, 1),
					H("street-stone", "boulder", 2, 1, 1),
					H("street-rat", "rat", 3, 0.5, -1),
					H("street-high-stone", "boulder", 3, 5, 1),
				],
				hearts: [
					Heart("first-heart", 1, 150, 0.4),
					Heart("street-middle-heart", 2, 152, 0.5),
					Heart("street-high-heart", 3, 154, 0.5),
				],
			},
			{
				id: "awning",
				name: "The Awning District",
				subtitle: "MIND THE BOUNCE. MIND THE DROP.",
				inset: 16,
				floors: 4,
				exitX: 88,
				startX: 64,
				palette: {
					brick: "#a17371",
					shadow: "#55465f",
					trim: "#d9cfa9",
					sky: "#3e506b",
				},
				banner: "THAT BIG LUG IS RUNNING OUT OF UP!",
				line: "Mabel: His hat is full of gravel!",
				windows: [
					...W("awning", 0, [232, 88], 0.3),
					...W("awning", 1, [88, 232], 13),
					...W("awning", 2, [224, 96], 28),
					...W("awning", 3, [96, 224], 43),
				],
				bumpers: [
					{ id: "bounce-a", x: 116, floor: 0, mode: "reverse", next: "drop-a" },
					{ id: "drop-a", x: 270, floor: 0, mode: "drop" },
					{ id: "crack-a", x: 160, floor: 1, mode: "split" },
				],
				spawns: [
					H("bumper-lesson", "bumper", 0, 0.3, 1, {
						bumper: "bounce-a",
						speed: 54,
						repeat: 18,
					}),
					H("split-lesson", "split", 1, 0.4, -1, {
						bumper: "crack-a",
						speed: 48,
					}),
					H("bird-lesson", "bird", 2, 0.6, 1, { repeat: 13 }),
					H("awning-rat", "rat", 3, 0.2, 1),
					H("awning-bird", "bird", 3, 5, -1),
				],
				hearts: [
					Heart("awning-heart", 0, 170, 1.2),
					Heart("awning-first-ledge-heart", 1, 152, 0.5),
					Heart("awning-high-heart", 2, 154, 0.5),
					Heart("awning-top-heart", 3, 154, 0.5),
				],
			},
			{
				id: "twilight",
				name: "The Last Few Ledges",
				subtitle: "EVEN THE BATS HAVE HEARD ABOUT YOU.",
				inset: 32,
				floors: 4,
				exitX: 232,
				startX: 80,
				palette: {
					brick: "#64758a",
					shadow: "#394658",
					trim: "#c4c5b3",
					sky: "#253749",
				},
				banner: "HE'S TALL. YOU'RE TALLER IN SPIRIT.",
				line: "Hank: Who ordered all these elbows?!",
				windows: [
					...W("twilight", 0, [96, 224], 1.1),
					...W("twilight", 1, [224, 96], 14),
					...W("twilight", 2, [104, 216], 30),
					...W("twilight", 3, [216, 104], 46),
				],
				bumpers: [
					{ id: "upper-crack", x: 160, floor: 2, mode: "split" },
					{
						id: "upper-bounce",
						x: 112,
						floor: 3,
						mode: "reverse",
						next: "upper-drop",
					},
					{ id: "upper-drop", x: 256, floor: 3, mode: "drop" },
				],
				spawns: [
					H("bat-lesson", "bat", 0, 0.3, 1, { repeat: 13 }),
					H("upper-bird", "bird", 1, 0.4, -1),
					H("upper-rat", "rat", 1, 5.5, 1),
					H("rush-bat-lesson", "bat", 1, 3.0, 1),
					H("upper-split", "split", 2, 0.4, 1, { bumper: "upper-crack" }),
					H("upper-bat", "bat", 2, 4.5, -1),
					H("upper-bumper", "bumper", 3, 0.5, 1, {
						bumper: "upper-bounce",
						speed: 48,
					}),
				],
				hearts: [
					Heart("upper-heart", 1, 170, 0.5),
					Heart("upper-low-heart", 0, 154, 1),
					Heart("upper-high-heart", 2, 156, 0.5),
					Heart("upper-top-heart", 3, 156, 0.5),
				],
			},
			{
				id: "roof",
				name: "Hank's Last Stand",
				subtitle: "THREE MORE LEDGES. ONE VERY SMALL EGO.",
				inset: 40,
				floors: 3,
				exitX: 232,
				startX: 80,
				palette: {
					brick: "#536b7a",
					shadow: "#293e53",
					trim: "#d2caab",
					sky: "#1d3046",
				},
				banner: "LOVE: ONE. HOT BUTTERED BRICKS: ZERO.",
				line: "Mabel: Catch! His goose is cooked!",
				windows: [
					...W("roof", 0, [224, 104], 0.6),
					...W("roof", 1, [104, 216], 14),
					...W("roof", 2, [216, 104], 30),
				],
				bumpers: [
					{ id: "roof-crack", x: 160, floor: 2, mode: "split" },
					{
						id: "roof-bounce",
						x: 112,
						floor: 0,
						mode: "reverse",
						next: "roof-drop",
					},
					{ id: "roof-drop", x: 248, floor: 0, mode: "drop" },
				],
				spawns: [
					H("roof-roll", "boulder", 0, 0.2, 1),
					H("roof-bounce", "bumper", 0, 5, 1, { bumper: "roof-bounce" }),
					H("roof-bird", "bird", 1, 0.2, 1, { repeat: 12 }),
					H("roof-bat", "bat", 1, 4.5, -1, { repeat: 14 }),
					H("roof-split", "split", 2, 0.4, 1, {
						bumper: "roof-crack",
						repeat: 11,
					}),
					H("roof-final-rat", "rat", 2, 4.2, -1, { repeat: 12 }),
				],
				hearts: [
					Heart("roof-help", 0, 160, 1),
					Heart("roof-crossing-heart", 1, 160, 0.5),
					Heart("final-heart", 2, 172, 0.1, { repeat: 7, life: 10 }),
					Heart("final-backup", 3, 168, 0.1, { repeat: 7, life: 10 }),
				],
				finale: {
					beats: [64, 112, 160],
					rescueX: 232,
					rescueTolerance: 21,
					needsHeart: true,
					departure: 9,
				},
			},
		],
		hard: {
			windowOrder: [1, 0],
			windowOffset: 2.4,
			hazardCadence: 0.82,
			combinations: [
				H("hard-rat", "rat", 1, 3.8, 1),
				H("hard-bat", "bat", 3, 7, -1),
			],
		},
	};
	TT.validateContent = (content = TT.CONTENT) => {
		const failures = [],
			ids = new Set();
		const unique = (id) => {
			if (!id || ids.has(id)) failures.push(`Missing or duplicate ID: ${id}`);
			ids.add(id);
		};
		if (content.sections.length !== 4)
			failures.push("A tower needs three sections and a roof");
		for (const s of content.sections) {
			unique(s.id);
			if (s.startX < s.inset || s.startX > content.width - s.inset)
				failures.push(`${s.id}: start is outside ledge`);
			for (let f = 0; f < s.floors; f++) {
				const ws = s.windows.filter((w) => w.floor === f);
				if (ws.length < 1)
					failures.push(`${s.id} floor ${f}: no reachable upward route`);
				for (const w of ws) {
					unique(w.id);
					if (w.x < s.inset + 8 || w.x > content.width - s.inset - 8)
						failures.push(`${w.id}: window outside ledge`);
					if (
						w.z !== content.baseZ + f * content.floorHeight ||
						w.toZ !== w.z + content.floorHeight ||
						w.delay < 0
					)
						failures.push(`${w.id}: invalid endpoints or timing`);
				}
			}
			const bumps = new Set(s.bumpers.map((b) => b.id));
			// A fixture can intentionally share the ID of the encounter it belongs to.
			for (const b of s.bumpers) {
				if (!b.id) failures.push(`${s.id}: missing fixture ID`);
				unique(`${s.id}:fixture:${b.id}`);
				if (b.next && !bumps.has(b.next))
					failures.push(`${b.id}: broken bumper link`);
			}
			for (const h of s.spawns) {
				if (!h.id) failures.push(`${s.id}: missing encounter ID`);
				unique(`${s.id}:spawn:${h.id}`);
				if (h.bumper && !bumps.has(h.bumper))
					failures.push(`${h.id}: missing bumper`);
				if (
					!["boulder", "bumper", "split", "rat", "bird", "bat"].includes(h.type)
				)
					failures.push(`${h.id}: unknown hazard`);
				if (
					!(
						h.after >= 0 &&
						h.repeat > h.telegraph &&
						h.floor >= 0 &&
						h.floor < s.floors
					)
				)
					failures.push(`${h.id}: invalid encounter timing/floor`);
			}
			for (const h of s.hearts) {
				unique(h.id);
				if (!(h.after >= 0 && h.repeat > 0 && h.life > 0))
					failures.push(`${h.id}: invalid heart timing`);
				if (
					h.floor < 0 ||
					h.floor > s.floors ||
					h.x < s.inset ||
					h.x > content.width - s.inset
				)
					failures.push(`${h.id}: unreachable heart`);
			}
		}
		if (
			TT.DEFAULTS.windowOpen < TT.DEFAULTS.climbTime + 1 ||
			TT.DEFAULTS.windowWarning <= 0
		)
			failures.push("Window opening cannot accommodate a fair climb");
		return failures;
	};
	if (typeof module !== "undefined") module.exports = TT;
})();
