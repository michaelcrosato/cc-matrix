(function (S) {
	"use strict";
	const E = My3D2dge;
	// Rasterise bespoke mechanical panels to native string sprites. Every panel has a five-tone ramp.
	function pixelAsset(w, h, paint) {
		const rows = Array.from({ length: h }, () => Array(w).fill(".")),
			palette = {};
		let index = 33;
		function key(color) {
			let k = Object.keys(palette).find((k) => palette[k] === color);
			if (!k) {
				while (index === 46 || index === 60 || index === 92) index++;
				k = String.fromCharCode(index++);
				palette[k] = color;
			}
			return k;
		}
		const dot = (x, y, c) => {
			x = Math.round(x);
			y = Math.round(y);
			if (rows[y] && x >= 0 && x < w) rows[y][x] = key(c);
		};
		const rect = (x, y, ww, hh, c) => {
			for (let yy = y; yy < y + hh; yy++)
				for (let xx = x; xx < x + ww; xx++) dot(xx, yy, c);
		};
		function poly(pts, color) {
			const tones = E.tones(color),
				x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0])))),
				x1 = Math.min(w - 1, Math.ceil(Math.max(...pts.map((p) => p[0]))));
			const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1])))),
				y1 = Math.min(h - 1, Math.ceil(Math.max(...pts.map((p) => p[1]))));
			for (let y = y0; y <= y1; y++)
				for (let x = x0; x <= x1; x++) {
					let inside = false;
					for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
						const a = pts[i],
							b = pts[j];
						if (
							a[1] > y !== b[1] > y &&
							x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
						)
							inside = !inside;
					}
					if (inside) {
						const v =
							((x - x0) / (x1 - x0 || 1)) * 0.36 +
							((y - y0) / (y1 - y0 || 1)) * 0.64;
						dot(x, y, v < 0.22 ? tones.lt : v > 0.72 ? tones.sh : tones.base);
					}
				}
			for (let i = 0; i < pts.length; i++) {
				const a = pts[i],
					b = pts[(i + 1) % pts.length],
					n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
				for (let k = 0; k <= n; k++)
					dot(
						a[0] + ((b[0] - a[0]) * k) / (n || 1),
						a[1] + ((b[1] - a[1]) * k) / (n || 1),
						i < 2 ? tones.hi : tones.deep,
					);
			}
		}
		paint({ dot, rect, poly });
		return E.sprite(
			rows.map((r) => r.join("")),
			palette,
		);
	}
	function playerAsset(color, flame = 0, seat = 0) {
		return pixelAsset(41, 49, ({ rect, poly }) => {
			if (flame) {
				poly(
					[
						[14, 33],
						[12, 41 + flame * 2],
						[20, 37],
						[28, 43 + flame],
						[26, 33],
					],
					"#eaa167",
				);
				rect(17, 35, 7, 6 + flame, "#f8e9ad");
			}
			poly(
				[
					[20, 1],
					[25, 16],
					[36, 32],
					[37, 38],
					[27, 34],
					[24, 40],
					[16, 40],
					[13, 34],
					[3, 38],
					[4, 31],
					[15, 16],
				],
				"#5b7188",
			);
			poly(
				[
					[20, 4],
					[23, 21],
					[25, 33],
					[20, 38],
					[15, 32],
					[17, 20],
				],
				"#c5d4d6",
			);
			poly(
				[
					[5, 32],
					[14, 24],
					[14, 33],
					[6, 35],
				],
				color,
			);
			poly(
				[
					[27, 24],
					[35, 32],
					[34, 35],
					[27, 33],
				],
				color,
			);
			poly(
				[
					[20, 13],
					[23, 23],
					[22, 28],
					[18, 28],
					[17, 23],
				],
				"#17384b",
			);
			rect(19, 17, 2, 7, "#a3edee");
			rect(12, 33, 4, 4, "#101d2d");
			rect(25, 33, 4, 4, "#101d2d");
			rect(13, 33, 2, 3, color);
			rect(26, 33, 2, 3, color);
			for (let i = 0; i <= seat; i++) rect(6 + i * 2, 32, 1, 3, "#f6e9c9");
			rect(19, 5, 2, 5, "#f4d6a5");
		});
	}
	const playerColors = ["#8ae5dc", "#efbc6e", "#ed9fbd", "#b7d98c"];
	const player = playerColors.map((c, i) => ({
		idle: playerAsset(c, 0, i),
		thrust: E.anim(
			[playerAsset(c, 1, i), playerAsset(c, 3, i), playerAsset(c, 2, i)],
			14,
		),
	}));
	const enemy = {
		hunter: pixelAsset(31, 37, ({ poly, rect }) => {
			poly(
				[
					[15, 0],
					[23, 15],
					[28, 30],
					[21, 27],
					[15, 34],
					[9, 27],
					[2, 30],
					[7, 15],
				],
				"#975d67",
			);
			poly(
				[
					[15, 4],
					[20, 19],
					[15, 28],
					[10, 19],
				],
				"#d8a084",
			);
			rect(13, 12, 5, 7, "#fff0bd");
			rect(6, 27, 5, 2, "#462c47");
			rect(20, 27, 5, 2, "#462c47");
		}),
		bomber: pixelAsset(61, 41, ({ poly, rect }) => {
			poly(
				[
					[30, 2],
					[43, 10],
					[57, 17],
					[58, 32],
					[47, 36],
					[37, 30],
					[22, 30],
					[12, 36],
					[2, 32],
					[3, 17],
					[16, 10],
				],
				"#8f7659",
			);
			poly(
				[
					[30, 5],
					[39, 15],
					[37, 29],
					[23, 29],
					[21, 15],
				],
				"#c5b68c",
			);
			rect(26, 12, 9, 6, "#131e2c");
			rect(28, 12, 5, 2, "#e9c68a");
			for (const x of [6, 45]) {
				rect(x, 19, 10, 10, "#302c3d");
				rect(x + 2, 20, 7, 2, "#efb969");
				rect(x + 3, 25, 5, 3, "#aa624b");
			}
			rect(24, 28, 13, 7, "#242b3c");
			rect(28, 30, 5, 4, "#ee9b68");
		}),
		scout: pixelAsset(39, 39, ({ poly, rect }) => {
			poly(
				[
					[19, 1],
					[30, 9],
					[35, 22],
					[28, 34],
					[10, 34],
					[3, 22],
					[8, 9],
				],
				"#81759e",
			);
			poly(
				[
					[19, 7],
					[26, 16],
					[24, 26],
					[14, 26],
					[12, 16],
				],
				"#b9a9cf",
			);
			rect(15, 15, 9, 7, "#201e36");
			rect(17, 16, 5, 4, "#e7d7ff");
			rect(2, 19, 7, 7, "#554664");
			rect(30, 19, 7, 7, "#554664");
			rect(18, 29, 3, 6, "#bf9ce9");
		}),
		anchor: pixelAsset(39, 39, ({ poly, rect }) => {
			poly(
				[
					[19, 0],
					[24, 12],
					[37, 18],
					[26, 24],
					[23, 37],
					[15, 37],
					[12, 24],
					[1, 18],
					[14, 12],
				],
				"#6e618b",
			);
			poly(
				[
					[19, 10],
					[28, 19],
					[19, 28],
					[10, 19],
				],
				"#cfb2ed",
			);
			rect(15, 15, 9, 9, "#211c3a");
			rect(17, 17, 5, 5, "#f6e8ff");
		}),
		rammer: pixelAsset(39, 39, ({ poly, rect }) => {
			poly(
				[
					[19, 1],
					[36, 31],
					[30, 37],
					[19, 28],
					[8, 37],
					[2, 31],
				],
				"#b0756c",
			);
			poly(
				[
					[19, 7],
					[29, 27],
					[19, 22],
					[9, 27],
				],
				"#e7af92",
			);
			poly(
				[
					[19, 14],
					[24, 24],
					[19, 21],
					[14, 24],
				],
				"#f6e4bc",
			);
			rect(6, 29, 6, 3, "#421f36");
			rect(27, 29, 6, 3, "#421f36");
		}),
		tractor: pixelAsset(57, 43, ({ poly, rect }) => {
			poly(
				[
					[5, 2],
					[17, 10],
					[20, 21],
					[36, 21],
					[39, 9],
					[51, 2],
					[54, 30],
					[43, 39],
					[13, 39],
					[2, 30],
				],
				"#796b90",
			);
			poly(
				[
					[7, 7],
					[14, 12],
					[14, 28],
					[7, 30],
				],
				"#b6a5c5",
			);
			poly(
				[
					[49, 7],
					[42, 12],
					[42, 28],
					[49, 30],
				],
				"#b6a5c5",
			);
			rect(20, 25, 17, 8, "#2b253a");
			rect(23, 26, 11, 3, "#ddc4fa");
			rect(5, 5, 6, 4, "#f7daee");
			rect(46, 5, 6, 4, "#f7daee");
		}),
		dive: pixelAsset(35, 33, ({ poly, rect }) => {
			poly(
				[
					[17, 2],
					[31, 9],
					[29, 23],
					[23, 19],
					[17, 30],
					[11, 19],
					[5, 23],
					[3, 9],
				],
				"#a97d62",
			);
			poly(
				[
					[17, 4],
					[23, 13],
					[17, 22],
					[11, 13],
				],
				"#e4bd84",
			);
			rect(14, 11, 7, 4, "#fff5c8");
		}),
		relay: pixelAsset(55, 55, ({ poly, rect }) => {
			poly(
				[
					[16, 3],
					[39, 3],
					[50, 16],
					[50, 39],
					[39, 50],
					[16, 50],
					[3, 39],
					[3, 16],
				],
				"#655869",
			);
			poly(
				[
					[18, 10],
					[36, 10],
					[43, 18],
					[43, 36],
					[35, 43],
					[18, 43],
					[10, 35],
					[10, 18],
				],
				"#ad8294",
			);
			poly(
				[
					[27, 13],
					[40, 27],
					[27, 41],
					[14, 27],
				],
				"#f0b7bd",
			);
			poly(
				[
					[27, 19],
					[34, 27],
					[27, 35],
					[20, 27],
				],
				"#893e61",
			);
			rect(25, 23, 5, 9, "#ffdfc8");
			for (const x of [5, 44])
				for (const y of [15, 32]) rect(x, y, 4, 5, "#e6b28e");
		}),
	};
	const drop = E.anim(
		[0, 1, 2, 1].map((i) =>
			pixelAsset(23, 23, ({ poly, rect }) => {
				poly(
					[
						[11, 1],
						[20, 11],
						[11, 21],
						[2, 11],
					],
					"#6d9694",
				);
				poly(
					[
						[11, 4],
						[17, 11],
						[11, 18],
						[5, 11],
					],
					"#bbefe0",
				);
				rect(10, 7 + i, 3, 8 - i * 2, "#fff2bf");
			}),
		),
		8,
	);
	Object.assign(S, {
		ASSETS: { player, enemy, drop, playerColors },
		pixelAsset,
		playerSkin: (color, i) => ({
			idle: playerAsset(color, 0, i),
			thrust: E.anim(
				[
					playerAsset(color, 1, i),
					playerAsset(color, 3, i),
					playerAsset(color, 2, i),
				],
				14,
			),
		}),
	});
})(globalThis.Fortnight);
