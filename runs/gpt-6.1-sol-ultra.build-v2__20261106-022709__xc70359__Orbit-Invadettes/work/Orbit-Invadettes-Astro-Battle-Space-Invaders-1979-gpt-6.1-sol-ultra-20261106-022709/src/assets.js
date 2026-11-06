/** Original pixel silhouettes. Native sprites retain their rows in headless builds. */
export function createAssets(E) {
	const ink = "#10162e";
	const hues = ["#74f2bd", "#ff8f98", "#c2a0ff", "#ffd17a"];
	const ramps = hues.map((c) => E.tones(c));
	function palette(color, eye = "#fff0c4") {
		const t = E.tones(color);
		return {
			o: ink,
			d: t.deep,
			s: t.sh,
			b: t.base,
			l: t.lt,
			h: t.hi,
			e: eye,
			x: "#231a42",
			f: "#ffbc68",
			w: "#f3f6ff",
			c: "#64d7ff",
		};
	}
	function sprite(rows, color, eye) {
		return E.sprite(
			rows,
			typeof color === "string" ? palette(color, eye) : color,
		);
	}
	function animation(frames, color, fps = 2) {
		return E.anim(
			frames.map((rows) => sprite(rows, color)),
			fps,
		);
	}

	const cannonA = [
		"........hh........",
		"........hl........",
		"........bl........",
		".......oblo.......",
		".......oblo.......",
		"......olhhlo......",
		".....olbccblo.....",
		"...oolbbccbbloo...",
		"..olbbblbbbbsblo..",
		".olbbbsbbbbsssblo.",
		"olbbsddbbbbsddsblo",
		"obssdddbbbbddddsbo",
		".oddddddddddddddo.",
		"..oo..........oo..",
	];
	const cannonB = [
		"........hh........",
		"........hl........",
		"........bl........",
		".......oblo.......",
		"..h....oblo....h..",
		"..ll..olhhlo..ll..",
		"..bl.olbccblo.lb..",
		".obloolbccbboolbo.",
		".olbbbblbbbbsblo..",
		"olbbbsbbbbbbsssblo",
		"olbbsddbbbbsddsblo",
		"obssdddbbbbddddsbo",
		".oddddddddddddddo.",
		"..oo..........oo..",
	];
	const ships = [sprite(cannonA, "#69ead6"), sprite(cannonB, "#ffb68a")];

	// The four silhouettes are deliberately different even in monochrome.
	const crowns = [
		[
			".......hh.......",
			"......oblo......",
			"....oolbbloo....",
			"...ollllllblo...",
			"..olbbxxbbxxblo.",
			".olbbbexbbexbblo",
			"olbbbbbbbbbbbblo",
			".obssbbbbbbssbo.",
			"..oossssssssoo..",
			"...obbo..obbo...",
			"..olbo....oblo..",
			"..ooo......ooo..",
		],
		[
			".......hh.......",
			"......oblo......",
			"....oolbbloo....",
			"...ollllllblo...",
			"..olbbxxbbxxblo.",
			".olbbbexbbexbblo",
			"olbbbbbbbbbbbblo",
			".obssbbbbbbssbo.",
			"..oossssssssoo..",
			"...obbo..obbo...",
			"....obloolbo....",
			"....ooo..ooo....",
		],
	];
	const peepers = [
		[
			"..hh........hh..",
			"..oblo....olbo..",
			"...obllllllbo...",
			"..olllbbbbbllo..",
			".olxxbbbbbxxblo.",
			".obexbbbbbexbbo.",
			"..obbbbbbbbbbo..",
			"...obxxwwxxbo...",
			"..obssssssssbo..",
			".olbo......oblo.",
			"olbo........oblo",
			"ooo..........ooo",
		],
		[
			"..hh........hh..",
			"..oblo....olbo..",
			"...obllllllbo...",
			"..olllbbbbbllo..",
			".olxxbbbbbxxblo.",
			".obexbbbbbexbbo.",
			"..obbbbbbbbbbo..",
			"...obxxwwxxbo...",
			"..obssssssssbo..",
			"..oblo....olbo..",
			"...oblo..olbo...",
			"...oooo..oooo...",
		],
	];
	const jellies = [
		[
			".....hhhhhh.....",
			"...ollllllblo...",
			"..olbbbbbbbblo..",
			".olbbxxbbxxbblo.",
			".obbbexbbexbbbo.",
			"olbbbbbbbbbbbblo",
			"obbbbssbbssbbbbo",
			".obssssssssssbo.",
			".obboobboobbbo..",
			".obbo.obbo.obbo.",
			"..ooo..ooo..ooo.",
			"................",
		],
		[
			".....hhhhhh.....",
			"...ollllllblo...",
			"..olbbbbbbbblo..",
			".olbbxxbbxxbblo.",
			".obbbexbbexbbbo.",
			"olbbbbbbbbbbbblo",
			"obbbbssbbssbbbbo",
			".obssssssssssbo.",
			"..obbboobboobbo.",
			".obbo.obbo.obbo.",
			".ooo..ooo..ooo..",
			"................",
		],
	];
	const crabs = [
		[
			".hl..........lh.",
			"oblo........olbo",
			"obbo..h..h..obbo",
			".obbolbllbloobbo",
			"..obbxxbbxxbbbo.",
			"..obbexbbexbbbo.",
			"...obbbbbbbbbo..",
			"..obssssssssbo..",
			".olboobbbbooblo.",
			"olbo..oooo..oblo",
			"ooo..........ooo",
			"................",
		],
		[
			"................",
			"................",
			".hlo..h..h..olh.",
			"olbbollbbllobblo",
			"obbbbxxbbxxbbbbo",
			".obbbexbbexbbbo.",
			"...obbbbbbbbbo..",
			"..obssssssssbo..",
			"..olbobbbbolbo..",
			"...oboooooobo...",
			"...ooo....ooo...",
			"................",
		],
	];
	const enemies = [crowns, peepers, jellies, crabs].map((f, i) =>
		animation(f, hues[i]),
	);
	const armourRows = [
		"....hhhhhhhh....",
		"..ollllllllllo..",
		".olbsbbbbbbsslo.",
		"olbsbbwwwwbbsslo",
		"obssbbssssbbssbo",
		"obsbbbbbbbbsssbo",
		".obsxxbbbbxxsbo.",
		"..obexbbbbexbo..",
		"...obssssssbo...",
		"..obbo....obbo..",
		".olbo......oblo.",
		".ooo........ooo.",
	];
	const armour = sprite(armourRows, "#95b7dd");
	const armourShell = sprite(
		[
			"....hhhhhhhh....",
			"..ollllllllllo..",
			".olbsbbbbbbsslo.",
			"olbsbbwwwwbbsslo",
			"obssbbssssbbssbo",
			"obsbbbbbbbbsssbo",
			".obs........sbo.",
			"..oo........oo..",
			"................",
			"................",
			"................",
			"................",
		],
		"#95b7dd",
	);
	const bombardierFrames = [
		[
			"...hh......hh...",
			"..olbo....olbo..",
			".ollllooolllblo.",
			"olbbxxbbbxxbbslo",
			"obbbeeebbeeebsbo",
			".obbbssbbssbbbo.",
			"..obbbbbbbbbbo..",
			"...obssssssbo...",
			"..obbofhhfobbo..",
			".obbo.fbbf.obbo.",
			".ooo..oddo..ooo.",
			".......oo.......",
		],
		[
			"...hh......hh...",
			"..olbo....olbo..",
			".ollllooolllblo.",
			"olbbxxbbbxxbbslo",
			"obbbeeebbeeebsbo",
			".obbbssbbssbbbo.",
			"..obbbbbbbbbbo..",
			"...obssssssbo...",
			"..obbofhhfobbo..",
			"...obofbbfobo...",
			"...oo.oddo.oo...",
			".......oo.......",
		],
	];
	const bombardier = animation(bombardierFrames, "#ffad79");

	const saucer = animation(
		[
			[
				"..........hhhh..........",
				"........ollllllo........",
				"......olbbbccbbblo......",
				".....olbbbbccbbbblo.....",
				"..oolllbbbbbbbbbbllloo..",
				".olhhhhhhhhhhhhhhhhhhlo.",
				"olbbbbebbbebbbebbbebbblo",
				".obssssssssssssssssssbo.",
				"...oobbbbbbbbbbbbbbsoo..",
				"......oossssssssoo......",
				"........ff..ff..........",
				"........................",
			],
			[
				"..........hhhh..........",
				"........ollllllo........",
				"......olbbbccbbblo......",
				".....olbbbbccbbbblo.....",
				"..oolllbbbbbbbbbbllloo..",
				".olhhhhhhhhhhhhhhhhhhlo.",
				"olbbebbbebbbebbbebbbbllo",
				".obssssssssssssssssssbo.",
				"...oobbbbbbbbbbbbbbsoo..",
				"......oossssssssoo......",
				"........f....f..........",
				".......ff....ff.........",
			],
		],
		"#ff749c",
		5,
	);
	const salvage = animation(
		[
			[
				"....h....",
				"...hlh...",
				"..hlblh..",
				".hlbbbsh.",
				"hlbbebssh",
				".hsbbbsh.",
				"..hsssh..",
				"...hsh...",
				"....h....",
			],
			[
				"....h....",
				"....lh...",
				"...lblh..",
				"..hlbbsh.",
				"..hbebsh.",
				"..hsbbsh.",
				"...sssh..",
				"....sh...",
				"....h....",
			],
			[
				"....h....",
				"....h....",
				"...hlh...",
				"...hbh...",
				"...heh...",
				"...hsh...",
				"...hsh...",
				"....h....",
				"....h....",
			],
			[
				"....h....",
				"...hl....",
				"..hlbl...",
				".hlbbsh..",
				".hbebsh..",
				".hsbbsh..",
				"..hsss...",
				"...hs....",
				"....h....",
			],
		],
		"#80f7da",
		8,
	);

	// A new hostile ship: heavy crescent silhouette, paired emitter sockets, central iris.
	function mothership(open = false) {
		const pixels = Array.from({ length: 30 }, () => Array(70).fill("."));
		const rect = (x, y, w, h, c) => {
			for (let j = y; j < y + h; j++)
				for (let i = x; i < x + w; i++)
					if (pixels[j] && i >= 0 && i < 70) pixels[j][i] = c;
		};
		const span = (y, x, right, c) => rect(x, y, right - x + 1, 1, c);
		for (let y = 3; y < 23; y++) {
			const inset = [
				31, 28, 26, 23, 19, 16, 12, 8, 4, 1, 0, 1, 3, 6, 9, 13, 16, 19, 22, 25,
			][y - 3];
			span(
				y,
				inset,
				69 - inset,
				y < 8 ? "l" : y < 13 ? "b" : y < 17 ? "s" : "d",
			);
			pixels[y][inset] = "o";
			pixels[y][69 - inset] = "o";
			if (y === 7 || y === 12) span(y, inset + 1, 68 - inset, "h");
		}
		rect(28, 6, 14, 7, "o");
		rect(29, 6, 12, 5, "c");
		rect(31, 6, 2, 3, "w");
		rect(29, 11, 12, 1, "s");
		for (const x of [10, 49]) {
			rect(x, 14, 11, 10, "o");
			rect(x + 1, 14, 9, 8, "l");
			rect(x + 2, 16, 7, 7, "s");
			rect(x + 3, 18, 5, 5, "x");
			rect(x + 4, 19, 3, 3, "e");
			rect(x + 3, 24, 5, 2, "o");
			rect(x + 4, 23, 3, 2, "f");
		}
		rect(29, 15, 12, 12, "o");
		rect(30, 16, 10, 10, open ? "f" : "s");
		if (open) {
			rect(32, 17, 6, 8, "e");
			rect(33, 18, 4, 6, "w");
		} else {
			rect(31, 17, 8, 3, "l");
			rect(31, 21, 8, 3, "b");
			rect(30, 20, 10, 1, "x");
		}
		for (const x of [3, 23, 44, 64]) {
			rect(x, 14, 3, 2, "e");
		}
		return sprite(
			pixels.map((r) => r.join("")),
			"#a397eb",
		);
	}
	const flagship = mothership(false),
		flagshipOpen = mothership(true);
	const repair = sprite(
		[
			"...h...",
			"..hlh..",
			".hlblh.",
			"hlbeblh",
			".hsbsh.",
			"..hsh..",
			"...h...",
		],
		"#9bf8d2",
	);
	const bomb = sprite(
		["..h..", ".hlh.", ".bbl.", "obfbo", ".bso.", "..o.."],
		"#ffad7f",
	);
	const heavyBomb = sprite(
		[
			"...h...",
			"..hlh..",
			".hbbbh.",
			"olbfblo",
			"obfffbo",
			".obfbo.",
			"..obo..",
			"...o...",
		],
		"#ff9b91",
	);
	return {
		ships,
		enemies,
		armour,
		armourShell,
		armourAnim: E.anim([armour, armour], 2),
		bombardier,
		saucer,
		salvage,
		flagship,
		flagshipOpen,
		repair,
		bomb,
		heavyBomb,
		hues,
		ramps,
		bunkerRamps: ["#648e9b", "#af8798", "#848cb6"].map((c) => E.ramp(c, 6)),
	};
}
